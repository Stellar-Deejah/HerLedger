import { RpcError, RpcErrorCode } from "../errors/index.js";

// ---------------------------------------------------------------------------
// Shared timeout/abort helper for RPC calls.
// ---------------------------------------------------------------------------

/** Default deadline applied to a single RPC call when none is supplied. */
export const DEFAULT_RPC_TIMEOUT_MS = 30_000;

export interface RpcCallOptions {
  /** Abort the call early. Treated the same as a timeout: throws `RpcError` with `code: "TIMEOUT"`. */
  signal?: AbortSignal;
  /** Deadline for the call, in ms. @default 30_000 */
  timeoutMs?: number;
}

/**
 * Race `promise` against a timeout (and an optional caller-supplied
 * `AbortSignal`). On expiry/abort, rejects with `RpcError` whose `code` is
 * `"TIMEOUT"` — the underlying `promise` is left to settle on its own (this
 * cannot cancel an in-flight `fetch` inside `@stellar/stellar-sdk`, which
 * does not accept an `AbortSignal`; the caller simply stops waiting).
 */
export function withRpcTimeout<T>(
  promise: Promise<T>,
  options?: RpcCallOptions,
  context?: { endpoint?: string; hash?: string }
): Promise<T> {
  const timeoutMs = options?.timeoutMs ?? DEFAULT_RPC_TIMEOUT_MS;
  const { signal } = options ?? {};

  if (signal?.aborted) {
    return Promise.reject(makeTimeoutError(timeoutMs, context));
  }

  return new Promise<T>((resolve, reject) => {
    let settled = false;

    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
    };

    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      reject(makeTimeoutError(timeoutMs, context));
    }, timeoutMs);

    function onAbort() {
      if (settled) return;
      settled = true;
      cleanup();
      reject(makeTimeoutError(timeoutMs, context));
    }

    signal?.addEventListener("abort", onAbort, { once: true });

    promise.then(
      (value) => {
        if (settled) return;
        settled = true;
        cleanup();
        resolve(value);
      },
      (err: unknown) => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(err);
      }
    );
  });
}

function makeTimeoutError(
  timeoutMs: number,
  context?: { endpoint?: string; hash?: string }
): RpcError {
  return new RpcError(RpcErrorCode.TIMEOUT, `RPC call timed out after ${timeoutMs}ms`, {
    context: { timeoutMs, ...context },
  });
}
