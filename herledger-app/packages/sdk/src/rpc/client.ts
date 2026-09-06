import { rpc as StellarRpc } from "@stellar/stellar-sdk";
import type { StellarNetworkConfig } from "../types/index.js";
import { RpcError } from "../errors/index.js";

// ---------------------------------------------------------------------------
// Soroban RPC client factory
// Centralized — do not instantiate SorobanRpc.Server directly in components.
// ---------------------------------------------------------------------------

let _server: StellarRpc.Server | null = null;
let _configuredUrl: string | null = null;

/**
 * Returns a singleton Soroban RPC Server instance for the given config.
 * Re-creates the instance only if the RPC URL changes.
 */
export function getSorobanRpcServer(config: StellarNetworkConfig): StellarRpc.Server {
  if (_server && _configuredUrl === config.rpcUrl) {
    return _server;
  }
  try {
    _server = new StellarRpc.Server(config.rpcUrl, {
      allowHttp: config.rpcUrl.startsWith("http://"),
    });
    _configuredUrl = config.rpcUrl;
    return _server;
  } catch (cause) {
    throw new RpcError(`Failed to initialize Soroban RPC server at ${config.rpcUrl}`, cause);
  }
}

/**
 * Fetch the current ledger sequence from the RPC server.
 */
export async function getLatestLedger(config: StellarNetworkConfig): Promise<number> {
  const server = getSorobanRpcServer(config);
  try {
    const result = await server.getLatestLedger();
    return result.sequence;
  } catch (cause) {
    throw new RpcError("Failed to fetch latest ledger", cause);
  }
}
