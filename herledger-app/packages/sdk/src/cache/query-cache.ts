// ---------------------------------------------------------------------------
// In-memory TTL query cache for read-only contract calls.
//
// Scope / SSR / Edge safety
// --------------------------
// This cache lives on the module singleton (`defaultQueryCache`), not on a
// per-request object. That is a deliberate choice, not an oversight:
//
//   - Cached values are read-only, publicly-observable contract state
//     (`get_business`, `get_event`, `get_attestation`, ...). The result for
//     a given (contract id, method, args) tuple is the same no matter which
//     request or user asked for it — there is no per-user/per-request data
//     to leak by sharing the cache across requests within the same process.
//   - Sharing it is what makes de-duplication of concurrent identical reads
//     possible: two components (or two concurrent requests in the same
//     Node.js/Edge isolate) racing to read the same business resolve to the
//     same in-flight RPC call instead of issuing two.
//   - Every entry expires after `ttlMs` (default 30s), so any staleness
//     introduced by sharing across requests is bounded and small.
//   - On serverless/Edge runtimes a fresh module instance (and therefore a
//     fresh, empty cache) is created per isolate/deployment, so there is no
//     risk of a *durable* cross-deployment cache — at worst you get a cache
//     that's cold on isolate start, exactly like any other in-memory cache.
//
// Callers that need per-request isolation (e.g. a multi-tenant server that
// wants to guarantee zero cross-request sharing) can construct their own
// `new QueryCache()` and pass it explicitly, or set `bypassCache: true` to
// force a fresh RPC call.
// ---------------------------------------------------------------------------

/** Default TTL applied to cached read-only queries. */
export const DEFAULT_QUERY_CACHE_TTL_MS = 30_000;

export interface QueryCacheOptions {
  /** Time-to-live for this call's cached result, in ms. @default 30_000 */
  ttlMs?: number;
  /** Skip the cache entirely for this call (always issue a fresh request). */
  bypassCache?: boolean;
}

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

/**
 * Lightweight in-memory TTL cache with in-flight request de-duplication.
 * Safe to instantiate more than once (e.g. for per-request isolation); the
 * SDK's read functions default to the shared `defaultQueryCache` singleton.
 */
export class QueryCache {
  private readonly store = new Map<string, CacheEntry<unknown>>();
  private readonly inFlight = new Map<string, Promise<unknown>>();

  /**
   * Return the cached value for `key` if fresh, join an in-flight request
   * for `key` if one exists, or invoke `loader` and cache/share its result.
   */
  async get<T>(key: string, loader: () => Promise<T>, options?: QueryCacheOptions): Promise<T> {
    if (options?.bypassCache) {
      return loader();
    }

    const cached = this.store.get(key);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value as T;
    }

    const existing = this.inFlight.get(key);
    if (existing) {
      return existing as Promise<T>;
    }

    const ttlMs = options?.ttlMs ?? DEFAULT_QUERY_CACHE_TTL_MS;
    const promise = loader()
      .then((value) => {
        this.store.set(key, { value, expiresAt: Date.now() + ttlMs });
        return value;
      })
      .finally(() => {
        this.inFlight.delete(key);
      });

    this.inFlight.set(key, promise);
    return promise;
  }

  /** Remove a single cached entry (does not affect an in-flight request). */
  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Clear all cached entries and forget in-flight de-duplication state. */
  clear(): void {
    this.store.clear();
    this.inFlight.clear();
  }

  /** Number of currently cached (not necessarily fresh) entries. Testing only. */
  get size(): number {
    return this.store.size;
  }
}

/** Shared cache instance used by the SDK's read-only contract functions. */
export const defaultQueryCache = new QueryCache();

/** Clear the shared query cache. Primarily for use in tests. */
export function clearQueryCache(): void {
  defaultQueryCache.clear();
}

/**
 * Build a stable cache key from a contract id, method name, and argument
 * list. Args are JSON-stringified with `bigint` support so callers don't
 * need to pre-serialize.
 */
export function buildCacheKey(contractId: string, method: string, args: readonly unknown[]): string {
  return `${contractId}:${method}:${hashArgs(args)}`;
}

function hashArgs(args: readonly unknown[]): string {
  return JSON.stringify(args, (_key, value) =>
    typeof value === "bigint" ? `${value.toString()}n` : value
  );
}
