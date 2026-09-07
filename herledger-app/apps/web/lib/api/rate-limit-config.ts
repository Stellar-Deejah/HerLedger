// apps/web/lib/api/rate-limit-config.ts
//
// Centralized rate-limit tiers for all API routes.
// Adjust these values based on expected traffic patterns.

import { rateLimit } from "./rate-limit";

// ── Tier definitions ───────────────────────────────────────────────────

/** Read-only GET endpoints (activity, attestations, health). */
export const readLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  maxRequests: 60, // 60 req/min
  name: "read",
});

/** Mutating POST/PUT/DELETE endpoints (register, disputes, etc.). */
export const writeLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  maxRequests: 20, // 20 req/min
  name: "write",
});

/** Sensitive auth-adjacent endpoints (account deletion). */
export const authLimiter = rateLimit({
  windowMs: 60_000 * 15, // 15 minutes
  maxRequests: 5, // 5 attempts per 15 min
  name: "auth-sensitive",
});

/** SSE/streaming endpoints (one connection at a time is normal). */
export const streamLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  maxRequests: 5, // 5 connections/min
  name: "stream",
});

/** Export endpoint (potentially expensive CSV generation). */
export const exportLimiter = rateLimit({
  windowMs: 60_000, // 1 minute
  maxRequests: 5, // 5 exports/min
  name: "export",
});
