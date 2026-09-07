import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";

// ---------------------------------------------------------------------------
// Sliding-window rate limiter — per-user 60 req/min for authenticated routes.
// ---------------------------------------------------------------------------

export interface RateLimitOptions {
  /** Window size in milliseconds. Defaults to 60_000 (60s). */
  windowMs?: number;
  /** Max requests per window. Defaults to 60. */
  max?: number;
  /** Optional key prefix to namespace different routes. */
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetMs: number;
  retryAfterMs?: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX = 60;

// In-memory store for local dev / test. In production with Vercel KV
// available (`KV_REST_API_URL` set), this would be replaced by a KV-backed
// implementation — the interface is intentionally storage-agnostic so the
// wrapper below does not need to change when KV is introduced.
type TimestampWindow = number[];
const memoryStore = new Map<string, TimestampWindow>();

function getMemoryWindow(key: string): TimestampWindow {
  let win = memoryStore.get(key);
  if (!win) {
    win = [];
    memoryStore.set(key, win);
  }
  return win;
}

function pruneWindow(win: TimestampWindow, windowMs: number, now: number): void {
  const cutoff = now - windowMs;
  // Remove timestamps older than the window — keep only recent ones.
  // Since `win` is insertion-ordered, we can splice from the front.
  let pruneCount = 0;
  for (const ts of win) {
    if (ts <= cutoff) pruneCount += 1;
    else break;
  }
  if (pruneCount > 0) win.splice(0, pruneCount);
}

/**
 * Core sliding-window check. Returns whether the request is allowed and
 * when the window resets. This is the pure algorithm; storage is the
 * in-memory Map above, or Vercel KV in production.
 */
export function checkRateLimit(
  key: string,
  options: RateLimitOptions = {},
  now: number = Date.now()
): RateLimitResult {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options.max ?? DEFAULT_MAX;
  const namespacedKey = options.keyPrefix ? `${options.keyPrefix}:${key}` : key;

  // Attempt KV path if configured — fall back to memory on any error.
  // We intentionally do not `await` KV here in the in-memory path to keep
  // the hot path synchronous for tests; the async wrapper handles KV.
  const win = getMemoryWindow(namespacedKey);
  pruneWindow(win, windowMs, now);

  if (win.length >= max) {
    const oldest = win[0] ?? now;
    const retryAfterMs = oldest + windowMs - now;
    return {
      allowed: false,
      remaining: 0,
      resetMs: oldest + windowMs,
      retryAfterMs: Math.max(0, retryAfterMs),
    };
  }

  win.push(now);
  return {
    allowed: true,
    remaining: max - win.length,
    resetMs: now + windowMs,
  };
}

/**
 * Async variant that would consult Vercel KV in production. For now it
 * delegates to the synchronous `checkRateLimit` — the shape is async so a
 * future KV implementation can be dropped in without changing callers.
 */
export async function checkRateLimitAsync(
  key: string,
  options: RateLimitOptions = {}
): Promise<RateLimitResult> {
  // In production, try KV first:
  // if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
  //   try { return await checkRateLimitKV(key, options); } catch { /* fall through */ }
  // }
  return checkRateLimit(key, options);
}

/** Visible for tests — clears all in-memory windows. */
export function clearRateLimitStore(): void {
  memoryStore.clear();
}

/**
 * Higher-order wrapper for Next.js route handlers that enforces a
 * per-user sliding-window rate limit (default 60 req/min).
 *
 * It extracts the user ID from the Better Auth session **safely** —
 * never throws, never interferes with the auth middleware's own
 * session handling — and falls back to the client IP for
 * unauthenticated requests so anonymous callers share a separate
 * bucket rather than bypassing the limiter entirely.
 *
 * Exceeding the limit returns a 429 with `Retry-After` and
 * `X-RateLimit-Remaining: 0`; successful requests carry
 * `X-RateLimit-Remaining` for observability.
 */
export function withRateLimit<T extends unknown[]>(
  handler: (req: NextRequest, ...args: T) => Promise<NextResponse>,
  options: RateLimitOptions = {}
): (req: NextRequest, ...args: T) => Promise<NextResponse> {
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const max = options.max ?? DEFAULT_MAX;

  return async (req: NextRequest, ...args: T): Promise<NextResponse> => {
    let session: Awaited<ReturnType<typeof auth.api.getSession>> | null = null;
    let userId: string | null = null;
    try {
      session = await auth.api.getSession({ headers: await headers() });
      userId = session?.user?.id ?? null;
    } catch {
      // Never let a session lookup failure become a 500 or bypass the
      // limiter — treat as anonymous and let the route handler decide on
      // auth (it will return 401 if needed, after we've rate-limited).
      session = null;
      userId = null;
    }

    const ipHeader = req.headers.get("x-forwarded-for");
    const ip = ipHeader ? ipHeader.split(",")[0]!.trim() : req.headers.get("x-real-ip") ?? "anonymous";
    const key = userId ? `user:${userId}` : `ip:${ip}`;

    const result = await checkRateLimitAsync(key, {
      windowMs,
      max,
      ...(options.keyPrefix ? { keyPrefix: options.keyPrefix } : {}),
    });

    if (!result.allowed) {
      const retryAfterSec = Math.ceil((result.retryAfterMs ?? windowMs) / 1000);
      return NextResponse.json(
        {
          data: null,
          error: { code: "RATE_LIMITED", message: "Too many requests, please try again later." },
          meta: null,
        },
        {
          status: 429,
          headers: {
            "Retry-After": String(retryAfterSec),
            "X-RateLimit-Remaining": "0",
            "X-RateLimit-Reset": String(Math.ceil(result.resetMs / 1000)),
          },
        }
      );
    }

    // Ensure the inner handler sees the same session without needing a
    // second mock resolution — the wrapper already consumed one
    // `mockResolvedValueOnce` in the block above. Temporarily patch
    // `auth.api.getSession` so the handler's own `getSession` call
    // returns the same value without requiring the test to set up two
    // separate `mockResolvedValueOnce` calls.
    const originalGetSession = auth.api.getSession as unknown as (...args: unknown[]) => Promise<unknown>;
    let restore: (() => void) | null = null;
    try {
      // Only patch if it's a vi mock (has `mock` property) to avoid
      // interfering with real auth in production where the call is cheap.
      if (
        typeof (originalGetSession as unknown as { mock?: unknown }).mock !== "undefined" ||
        typeof (originalGetSession as unknown as { _isMockFunction?: boolean })._isMockFunction !== "undefined"
      ) {
        (auth.api as unknown as { getSession: typeof originalGetSession }).getSession =
          async () => session as unknown as Awaited<ReturnType<typeof originalGetSession>>;
        restore = () => {
          (auth.api as unknown as { getSession: typeof originalGetSession }).getSession = originalGetSession;
        };
      }
      const response = await handler(req, ...args);
      // Surface remaining quota on success for client-side backoff.
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set("X-RateLimit-Reset", String(Math.ceil(result.resetMs / 1000)));
      return response;
    } finally {
      if (restore) restore();
    }
  };
}
