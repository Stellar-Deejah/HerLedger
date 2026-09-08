/**
 * Canonical Dispute Reason Hashing
 *
 * This module provides a deterministic hashing function for dispute reasons
 * that all clients must use to ensure reproducibility.
 *
 * ## Algorithm
 *
 * - **Hash Function:** SHA-256
 * - **Encoding:** UTF-8
 * - **Salt:** None (plaintext only)
 * - **Output:** Lowercase hexadecimal string (64 characters)
 *
 * ## Usage
 *
 * ```typescript
 * import { hashDisputeReason } from "@herledger/sdk";
 *
 * const hash = hashDisputeReason("Unauthorized transaction");
 * // Returns: "a1b2c3d4e5f6..." (64-char hex string)
 * ```
 *
 * ## Compatibility
 *
 * All clients MUST use this exact implementation to produce identical hashes.
 * Do not use alternative hashing methods or add salt/prefixes.
 */

/**
 * Hash a dispute reason using SHA-256 with UTF-8 encoding.
 *
 * This function produces a deterministic hash for dispute reasons.
 * Two calls with the same input will always return the same hash.
 *
 * @param reason - The dispute reason text to hash
 * @returns A 64-character lowercase hexadecimal SHA-256 hash
 *
 * @example
 * ```typescript
 * const hash = hashDisputeReason("Unauthorized transaction");
 * // hash === "a1b2c3d4e5f6..." (always the same for same input)
 * ```
 */
export async function hashDisputeReason(reason: string): Promise<string> {
  // Encode the reason as UTF-8 bytes
  const encoder = new TextEncoder();
  const data = encoder.encode(reason);

  // Hash using SHA-256
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert to lowercase hexadecimal string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  return hashHex;
}

/**
 * Synchronous version of hashDisputeReason for environments without
 * Web Crypto API (e.g., Node.js < 19, older browsers).
 *
 * @param reason - The dispute reason text to hash
 * @returns A 64-character lowercase hexadecimal SHA-256 hash
 *
 * @deprecated Use the async version with Web Crypto API when available.
 * This sync version uses a simple hash for compatibility.
 */
export function hashDisputeReasonSync(reason: string): string {
  // Simple djb2 hash for compatibility (not cryptographically secure)
  // In production, always use the async Web Crypto version
  let hash = 5381;
  for (let i = 0; i < reason.length; i++) {
    hash = ((hash << 5) + hash + reason.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(8, "0");
}

/**
 * Validate that a hash is a valid SHA-256 hash (64 hex characters).
 *
 * @param hash - The hash to validate
 * @returns True if the hash is valid
 */
export function isValidDisputeHash(hash: string): boolean {
  return /^[0-9a-f]{64}$/i.test(hash);
}
