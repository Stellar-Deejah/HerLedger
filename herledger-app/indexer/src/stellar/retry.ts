import { logger } from "../observability/index.js";
import { IndexerError } from "../types/index.js";

// ---------------------------------------------------------------------------
// Exponential back-off retry helper for RPC calls
// ---------------------------------------------------------------------------

export interface RetryConfig {
  maxAttempts?: number;
  baseDelayMs?: number;
  maxDelayMs?: number;
  jitterFactor?: number;
}

const DEFAULT_CONFIG: Required<RetryConfig> = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 16000,
  jitterFactor: 0.1,
};

/**
 * Retry a function with exponential backoff and jitter.
 * Attempts: 1s, 4s, 16s by default (configurable).
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  operationName: string,
  config: RetryConfig = {}
): Promise<T> {
  const cfg = { ...DEFAULT_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 1; attempt <= cfg.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      // Check if error is permanent (should not retry)
      if (isPermanentError(err)) {
        throw new IndexerError(
          `Permanent error in ${operationName} (attempt ${attempt}/${cfg.maxAttempts})`,
          err
        );
      }

      if (attempt === cfg.maxAttempts) {
        throw new IndexerError(
          `${operationName} failed after ${cfg.maxAttempts} attempts`,
          lastError
        );
      }

      const delayMs = calculateBackoffDelay(attempt, cfg);
      logger.warn(
        {
          operation: operationName,
          attempt,
          maxAttempts: cfg.maxAttempts,
          delayMs,
          error: err instanceof Error ? err.message : String(err),
        },
        `Transient error in ${operationName}, retrying in ${delayMs}ms`
      );

      await sleep(delayMs);
    }
  }

  // Should never reach here due to throw in final attempt
  throw new IndexerError(`${operationName} failed after ${cfg.maxAttempts} attempts`, lastError);
}

/**
 * Calculate exponential backoff with jitter.
 * Prevents thundering herd when multiple callers retry simultaneously.
 */
function calculateBackoffDelay(attempt: number, cfg: Required<RetryConfig>): number {
  // Exponential: 2^(attempt-1) * baseDelayMs
  const exponentialDelay = Math.pow(2, attempt - 1) * cfg.baseDelayMs;
  const cappedDelay = Math.min(exponentialDelay, cfg.maxDelayMs);

  // Add jitter: ±jitterFactor% of the capped delay
  const jitterRange = cappedDelay * cfg.jitterFactor;
  const jitter = (Math.random() - 0.5) * 2 * jitterRange;

  return Math.max(0, Math.round(cappedDelay + jitter));
}

/**
 * Determine if an error is permanent (should not retry) or transient (should retry).
 * Permanent: client errors (4xx), schema/XDR parsing errors, contract decode errors.
 * Transient: network errors, timeouts, server errors (5xx), rate limits (429).
 *
 * Matching strategy:
 * 1. Check for error types/keywords first (less prone to false matches)
 * 2. Then check for HTTP status codes in structured format (e.g., "HTTP 400")
 * 3. Avoid free-text numeric substring matching (e.g., "400ms" in timeout message)
 */
function isPermanentError(err: unknown): boolean {
  if (!(err instanceof Error)) return false;

  const message = err.message.toLowerCase();

  // Transient errors (check these first to avoid false positives)
  // Keywords like "timeout" must be checked before numeric codes, to prevent
  // "Request timed out after 30400ms" from matching "400" first
  if (message.includes("timeout")) return false;
  if (message.includes("econnrefused")) return false;
  if (message.includes("econnreset")) return false;
  if (message.includes("enotfound")) return false;
  if (message.includes("ehostunreach")) return false;
  if (message.includes("enetunreach")) return false;
  if (message.includes("rate")) return false;
  if (message.includes("too many requests")) return false;
  if (message.includes("service unavailable")) return false;
  if (message.includes("bad gateway")) return false;
  if (message.includes("gateway timeout")) return false;

  // Transient server errors (5xx) - check after keywords
  // Match "HTTP 5xx", "5xx error", "error 5xx" patterns to avoid false positives
  if (/\b(http\s+)?5\d{2}\b/i.test(message)) return false;
  if (/\bserver\s+error\b/i.test(message)) return false;

  // Rate limit (429) - structured matching
  if (/\b(http\s+)?429\b/i.test(message)) return false;
  if (/\b(http\s+)?502\b/i.test(message)) return false;
  if (/\b(http\s+)?503\b/i.test(message)) return false;

  // Permanent errors (client errors and parsing errors)
  // Check keyword-based errors first (XDR, contract, parsing)
  if (message.includes("xdr")) return true;
  if (message.includes("decode")) return true;
  if (message.includes("invalid contract")) return true;
  if (message.includes("malformed")) return true;
  if (message.includes("parse error")) return true;
  if (message.includes("syntax error")) return true;

  // Client errors (4xx) - structured matching to avoid "400ms" false positives
  // Match "HTTP 400", "400 bad request", "error 400", etc.
  if (/\b(http\s+)?400\b/i.test(message)) return true;
  if (/\b(http\s+)?401\b/i.test(message)) return true;
  if (/\b(http\s+)?403\b/i.test(message)) return true;
  if (/\b(http\s+)?404\b/i.test(message)) return true;
  if (/\b(http\s+)?4\d{2}\b/i.test(message)) return true;

  // Explicit error types
  if (message.includes("bad request")) return true;
  if (message.includes("unauthorized")) return true;
  if (message.includes("forbidden")) return true;
  if (message.includes("not found")) return true;

  // Default: treat as transient (fail after max retries, but retry initially)
  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
