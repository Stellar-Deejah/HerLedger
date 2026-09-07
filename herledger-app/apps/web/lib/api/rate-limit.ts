// apps/web/lib/api/rate-limit.ts
//
// In-memory sliding-window rate limiter for Next.js API routes.
// Keyed by IP address (or user ID when authenticated).

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ── Types ──────────────────────────────────────────────────────────────

export interface RateLimitConfig {
  /** Time window in milliseconds (default: 60_000 = 1 minute). */
  windowMs?: number;
  /** Maximum number of requests allowed within the window (default: 30). */
  maxRequests?: number;
  /** Optional human-readable name for logging (e.g. "disputes:POST"). */
  name?: string;
}

interface WindowEntry {
  timestamps: number[];
}

// ── Implementation ─────────────────────────────────────────────────────

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_REQUESTS = 30;
const CLEANUP_INTERVAL_MS = 5 * 60_000; // prune stale keys every 5 min

/**
 * Creates a rate limiter instance. Each call creates an independent
 * counter store, so different routes can have different limits.
 */
export function rateLimit(config: RateLimitConfig = {}) {
  const windowMs = config.windowMs ?? DEFAULT_WINDOW_MS;
  const maxRequests = config.maxRequests ?? DEFAULT_MAX_REQUESTS;
  const store = new Map<string, WindowEntry>();

  // Periodic cleanup of expired entries to prevent memory leaks
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    const cutoff = now - windowMs;
    for (const [key, entry] of store) {
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
      if (entry.timestamps.length === 0) {
        store.delete(key);
      }
    }
  }, CLEANUP_INTERVAL_MS);

  // Allow the timer to not prevent process exit
  if (cleanupTimer.unref) {
    cleanupTimer.unref();
  }

  return {
    /**
     * Check whether the given key (IP / user ID) has exceeded the rate limit.
     *
     * @returns `null` if within limits (proceed with handler).
     * @returns `NextResponse` with 429 status if rate-limited (return this from your handler).
     */
    check(key: string): NextResponse | null {
      const now = Date.now();
      const cutoff = now - windowMs;

      let entry = store.get(key);
      if (!entry) {
        entry = { timestamps: [] };
        store.set(key, entry);
      }

      // Slide the window: drop timestamps older than cutoff
      entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

      if (entry.timestamps.length >= maxRequests) {
        const retryAfterMs = entry.timestamps[0]! + windowMs - now;
        const retryAfterSec = Math.ceil(retryAfterMs / 1000);

        return NextResponse.json(
          {
            data: null,
            error: {
              code: "RATE_LIMITED",
              message: `Too many requests. Please retry after ${retryAfterSec} second(s).`,
            },
          },
          {
            status: 429,
            headers: {
              "Retry-After": String(retryAfterSec),
              "X-RateLimit-Limit": String(maxRequests),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(Math.ceil((entry.timestamps[0]! + windowMs) / 1000)),
            },
          }
        );
      }

      // Record this request
      entry.timestamps.push(now);

      return null; // within limits
    },

    /** Exposed for testing: returns current request count for a key. */
    _getCount(key: string): number {
      const now = Date.now();
      const cutoff = now - windowMs;
      const entry = store.get(key);
      if (!entry) return 0;
      return entry.timestamps.filter((t) => t > cutoff).length;
    },

    /** Exposed for testing: clears all entries. */
    _reset(): void {
      store.clear();
    },
  };
}

// ── Helper: extract client IP ──────────────────────────────────────────

/**
 * Extracts the client's IP address from the request.
 * Checks X-Forwarded-For (for reverse proxies), then X-Real-IP,
 * then falls back to a default.
 */
export function getClientIp(req: NextRequest | Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    // X-Forwarded-For can contain multiple IPs; the first is the client
    return forwarded.split(",")[0]!.trim();
  }
  return req.headers.get("x-real-ip") ?? "unknown";
}

/**
 * Builds a rate-limit key. When the user is authenticated, prefer their
 * user ID (so the limit follows the user across IPs / VPNs). Otherwise
 * fall back to IP.
 */
export function rateLimitKey(req: NextRequest | Request, userId?: string | null): string {
  return userId ? `user:${userId}` : `ip:${getClientIp(req)}`;
}
