import { rpc as StellarRpc } from "@stellar/stellar-sdk";
import type { StellarNetworkConfig } from "../types/index.js";
import { RpcError, RpcErrorCode } from "../errors/index.js";
import { CircuitBreaker } from "./circuit-breaker.js";
import type { CircuitBreakerOptions, CircuitState } from "./circuit-breaker.js";

// ---------------------------------------------------------------------------
// Soroban RPC client factory — multi-endpoint with circuit breaker
//
// Centralized — do not instantiate SorobanRpc.Server directly in components.
// ---------------------------------------------------------------------------

/** Per-endpoint state: server instance + circuit breaker. */
interface EndpointEntry {
  url: string;
  server: StellarRpc.Server;
  breaker: CircuitBreaker;
}

/** In-memory registry keyed by the full comma-separated URL list. */
let _entries: EndpointEntry[] = [];
let _configuredKey: string | null = null;
let _circuitBreakerOptions: Partial<CircuitBreakerOptions> | undefined;

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

/**
 * Override the default circuit-breaker options for **all** endpoints.
 * Must be called before the first `getSorobanRpcServer()` call, or followed
 * by `resetRpcState()` to force re-initialisation.
 */
export function configureCircuitBreaker(options: Partial<CircuitBreakerOptions>): void {
  _circuitBreakerOptions = options;
}

/**
 * Parse a `StellarNetworkConfig` into an ordered list of RPC URLs.
 *
 * The config's `rpcUrl` field may contain a single URL **or** a
 * comma-separated list (from `STELLAR_RPC_URLS`). Leading/trailing
 * whitespace around each URL is stripped.
 */
export function parseRpcUrls(config: StellarNetworkConfig): string[] {
  return config.rpcUrl
    .split(",")
    .map((u) => u.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Initialisation helpers
// ---------------------------------------------------------------------------

function buildEntries(urls: string[]): EndpointEntry[] {
  return urls.map((url) => ({
    url,
    server: new StellarRpc.Server(url, {
      allowHttp: url.startsWith("http://"),
    }),
    breaker: new CircuitBreaker(_circuitBreakerOptions),
  }));
}

function ensureInitialised(config: StellarNetworkConfig): void {
  const key = config.rpcUrl;
  if (_configuredKey === key && _entries.length > 0) return;

  const urls = parseRpcUrls(config);
  if (urls.length === 0) {
    throw new RpcError(
      RpcErrorCode.NO_ENDPOINTS_CONFIGURED,
      "No RPC URLs configured — check STELLAR_RPC_URLS"
    );
  }

  _entries = buildEntries(urls);
  _configuredKey = key;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Returns a Soroban RPC Server instance using **priority-based failover**.
 *
 * The first endpoint whose circuit breaker allows a request is returned.
 * If every endpoint's circuit is OPEN, an `RpcError` is thrown immediately
 * (fail-fast).
 *
 * Re-creates server instances only when the configured URL list changes.
 */
export function getSorobanRpcServer(config: StellarNetworkConfig): StellarRpc.Server {
  ensureInitialised(config);

  for (const entry of _entries) {
    if (entry.breaker.allowRequest()) {
      return entry.server;
    }
  }

  throw new RpcError(
    RpcErrorCode.ALL_ENDPOINTS_UNAVAILABLE,
    "All RPC endpoints are unavailable (circuit breaker OPEN on every endpoint)"
  );
}

/**
 * Returns the currently active endpoint URL (the first one whose circuit
 * breaker allows requests), or `null` if all circuits are open.
 */
export function getActiveRpcEndpoint(config: StellarNetworkConfig): string | null {
  ensureInitialised(config);
  for (const entry of _entries) {
    if (entry.breaker.allowRequest()) {
      return entry.url;
    }
  }
  return null;
}

/**
 * Record a successful RPC call against the endpoint identified by `url`.
 */
export function recordRpcSuccess(url: string): void {
  const entry = _entries.find((e) => e.url === url);
  entry?.breaker.onSuccess();
}

/**
 * Record a failed RPC call against the endpoint identified by `url`.
 */
export function recordRpcFailure(url: string): void {
  const entry = _entries.find((e) => e.url === url);
  entry?.breaker.onFailure();
}

/**
 * Execute an RPC operation with automatic **priority-based failover**.
 *
 * Tries each endpoint in order (skipping those with an open circuit).
 * On the first success the circuit breaker is reset. On failure, the breaker
 * is notified and the next endpoint is tried. If all endpoints fail, the
 * last error is re-thrown wrapped in an `RpcError`.
 */
export async function withRpcFailover<T>(
  config: StellarNetworkConfig,
  operation: (server: StellarRpc.Server) => Promise<T>
): Promise<T> {
  ensureInitialised(config);

  let lastError: unknown;

  for (const entry of _entries) {
    if (!entry.breaker.allowRequest()) continue;

    try {
      const result = await operation(entry.server);
      entry.breaker.onSuccess();
      return result;
    } catch (err) {
      entry.breaker.onFailure();
      lastError = err;
      // Fall through to the next endpoint.
    }
  }

  throw new RpcError(
    RpcErrorCode.ALL_ENDPOINTS_UNAVAILABLE,
    "All RPC endpoints failed or have open circuit breakers",
    { cause: lastError }
  );
}

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------

/** Result returned by `checkRpcHealth`. */
export interface RpcHealthResult {
  /** Whether the RPC is reachable and returned a valid ledger sequence. */
  healthy: boolean;
  /** The URL of the endpoint that was checked (or the first available). */
  activeEndpoint: string | null;
  /** Latest ledger sequence if healthy, `undefined` otherwise. */
  latestLedger?: number;
  /** Error message if unhealthy. */
  error?: string;
  /** Per-endpoint circuit breaker status. */
  endpoints: Array<{
    url: string;
    circuitState: CircuitState;
    failureCount: number;
  }>;
}

/**
 * Perform a lightweight health check against the Soroban RPC by calling
 * `getLatestLedger`. Returns a structured result suitable for `/health`
 * endpoints.
 */
export async function checkRpcHealth(config: StellarNetworkConfig): Promise<RpcHealthResult> {
  ensureInitialised(config);

  const endpointStatuses = _entries.map((e) => ({
    url: e.url,
    circuitState: e.breaker.state,
    failureCount: e.breaker.failureCount,
  }));

  try {
    const result = await withRpcFailover(config, (server) => server.getLatestLedger());

    return {
      healthy: true,
      activeEndpoint: getActiveRpcEndpoint(config),
      latestLedger: result.sequence,
      endpoints: endpointStatuses,
    };
  } catch (err) {
    return {
      healthy: false,
      activeEndpoint: null,
      error: err instanceof Error ? err.message : String(err),
      endpoints: _entries.map((e) => ({
        url: e.url,
        circuitState: e.breaker.state,
        failureCount: e.breaker.failureCount,
      })),
    };
  }
}

// ---------------------------------------------------------------------------
// Fetch latest ledger (updated to use failover)
// ---------------------------------------------------------------------------

/**
 * Fetch the current ledger sequence from the RPC server.
 * Uses priority-based failover across all configured endpoints.
 */
export async function getLatestLedger(config: StellarNetworkConfig): Promise<number> {
  try {
    const result = await withRpcFailover(config, (server) => server.getLatestLedger());
    return result.sequence;
  } catch (cause) {
    throw new RpcError(RpcErrorCode.REQUEST_FAILED, "Failed to fetch latest ledger", { cause });
  }
}

// ---------------------------------------------------------------------------
// Reset (testing / hot-reload)
// ---------------------------------------------------------------------------

/**
 * Reset all internal state. Primarily for use in tests.
 */
export function resetRpcState(): void {
  _entries = [];
  _configuredKey = null;
  _circuitBreakerOptions = undefined;
}
