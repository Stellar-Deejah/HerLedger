import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";

// ---------------------------------------------------------------------------
// AES-256-GCM encryption for dispute reason plaintext at rest.
//
// The encryption key is never itself stored. It is derived on demand from
// `BETTER_AUTH_SECRET` via HKDF (RFC 5869, HMAC-SHA256), so no separate key
// management infrastructure is required for this MVP: the same server
// secret that already protects sessions also protects dispute reasons, and
// rotating `BETTER_AUTH_SECRET` (out of scope here) would need a re-encrypt
// migration exactly like rotating any other secret-derived key would.
//
// HKDF's `info` parameter is a fixed, purpose-specific string. That
// cryptographically separates this key from any other key HerLedger might
// derive from the same root secret in future (e.g. a field-level encryption
// key for a different model), even though they would share the same input
// keying material (IKM). Domain separation like this is the entire reason
// to use HKDF instead of using BETTER_AUTH_SECRET's bytes directly as an
// AES key: it means a future second use of the secret can never collide
// with this one.
// ---------------------------------------------------------------------------

const HKDF_HASH = "sha256";
const HKDF_INFO = "herledger:dispute-reason:aes-256-gcm:v1";
// HKDF's salt need not be secret; it only needs to be fixed for a given
// derivation so the same key comes out every time. A per-record random salt
// would be more conventional for HKDF-as-KDF-for-many-independent-keys use
// cases, but here we intentionally want ONE deterministic key from ONE
// secret, so every existing ciphertext stays decryptable without maintaining
// a salt-per-record key store.
const HKDF_SALT = "herledger-dispute-reason-encryption-salt";
const KEY_LENGTH_BYTES = 32; // AES-256
const IV_LENGTH_BYTES = 12; // 96-bit nonce, recommended size for GCM
const ALGORITHM = "aes-256-gcm";
const ENVELOPE_DELIMITER = ":";
const ENVELOPE_PART_COUNT = 3;

export class DisputeDecryptionError extends Error {
  constructor(message = "Failed to decrypt dispute reason", options?: ErrorOptions) {
    super(message, options);
    this.name = "DisputeDecryptionError";
  }
}

/**
 * Derive a 256-bit AES key from the application's BETTER_AUTH_SECRET using
 * HKDF-SHA256. Deterministic: the same secret always derives the same key,
 * so previously-encrypted disputes remain decryptable without a separate
 * key store.
 */
export function deriveDisputeEncryptionKey(secret: string): Buffer {
  if (!secret || secret.length < 32) {
    throw new Error(
      "Cannot derive dispute encryption key: BETTER_AUTH_SECRET is missing or shorter than 32 characters"
    );
  }
  const okm = hkdfSync(
    HKDF_HASH,
    Buffer.from(secret, "utf8"),
    HKDF_SALT,
    HKDF_INFO,
    KEY_LENGTH_BYTES
  );
  return Buffer.from(okm);
}

/**
 * Encrypt a dispute reason for storage in `Dispute.reasonPlaintext`.
 *
 * Despite the column name (kept because it is the field the on-chain
 * `reason_hash` is derived from -- see dispute-form.tsx), the value written
 * to the database is always the ciphertext envelope produced here; raw
 * plaintext is never persisted.
 *
 * Envelope format: `${iv}:${authTag}:${ciphertext}`, each segment base64
 * encoded. A fresh random IV is generated per call -- GCM requires a unique
 * nonce per (key, message) pair -- and the auth tag is carried alongside
 * the ciphertext so a single string column is enough to round-trip.
 */
export function encryptDisputeReason(plaintext: string, secret: string): string {
  const key = deriveDisputeEncryptionKey(secret);
  const iv = randomBytes(IV_LENGTH_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [iv, authTag, ciphertext].map((buf) => buf.toString("base64")).join(ENVELOPE_DELIMITER);
}

/**
 * Decrypt a `Dispute.reasonPlaintext` envelope produced by
 * `encryptDisputeReason`.
 *
 * Always throws `DisputeDecryptionError` on failure -- never lets a native
 * node:crypto exception (or a malformed-envelope TypeError) propagate
 * unhandled -- so callers (API routes) can catch a single, predictable
 * error type and respond with a clean 500 instead of the process crashing
 * or leaking internal details. Failure cases include: wrong/rotated key,
 * corrupted or truncated ciphertext, a tampered auth tag, and a malformed
 * envelope string.
 */
export function decryptDisputeReason(envelope: string, secret: string): string {
  const parts = envelope.split(ENVELOPE_DELIMITER);
  if (parts.length !== ENVELOPE_PART_COUNT) {
    throw new DisputeDecryptionError("Malformed dispute reason envelope");
  }
  const [ivB64, authTagB64, ciphertextB64] = parts as [string, string, string];

  try {
    const key = deriveDisputeEncryptionKey(secret);
    const iv = Buffer.from(ivB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const ciphertext = Buffer.from(ciphertextB64, "base64");

    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);
    const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return plaintext.toString("utf8");
  } catch (cause) {
    throw new DisputeDecryptionError(
      "Failed to decrypt dispute reason: wrong key, corrupted data, or tampered ciphertext",
      { cause }
    );
  }
}
