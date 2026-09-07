import { describe, it, expect } from "vitest";

import {
  deriveDisputeEncryptionKey,
  encryptDisputeReason,
  decryptDisputeReason,
  DisputeDecryptionError,
} from "../dispute-encryption";

const SECRET_A = "dev-secret-must-be-at-least-32-characters-long";
const SECRET_B = "a-completely-different-secret-that-is-also-long-enough";

describe("deriveDisputeEncryptionKey", () => {
  it("derives a 32-byte (AES-256) key", () => {
    const key = deriveDisputeEncryptionKey(SECRET_A);
    expect(key).toBeInstanceOf(Buffer);
    expect(key.length).toBe(32);
  });

  it("is deterministic for the same secret", () => {
    const key1 = deriveDisputeEncryptionKey(SECRET_A);
    const key2 = deriveDisputeEncryptionKey(SECRET_A);
    expect(key1.equals(key2)).toBe(true);
  });

  it("derives different keys for different secrets", () => {
    const keyA = deriveDisputeEncryptionKey(SECRET_A);
    const keyB = deriveDisputeEncryptionKey(SECRET_B);
    expect(keyA.equals(keyB)).toBe(false);
  });

  it("rejects a secret shorter than 32 characters", () => {
    expect(() => deriveDisputeEncryptionKey("too-short")).toThrow(/shorter than 32 characters/);
  });

  it("rejects an empty secret", () => {
    expect(() => deriveDisputeEncryptionKey("")).toThrow();
  });
});

describe("encryptDisputeReason / decryptDisputeReason round trip", () => {
  it("round-trips a typical dispute reason", () => {
    const plaintext = "The reported payment amount does not match my invoice #4471.";
    const envelope = encryptDisputeReason(plaintext, SECRET_A);
    const decrypted = decryptDisputeReason(envelope, SECRET_A);
    expect(decrypted).toBe(plaintext);
  });

  it("round-trips an empty string", () => {
    const envelope = encryptDisputeReason("", SECRET_A);
    expect(decryptDisputeReason(envelope, SECRET_A)).toBe("");
  });

  it("round-trips unicode content", () => {
    const plaintext = "Дело не оплачено — 请核实此笔款项 🚨";
    const envelope = encryptDisputeReason(plaintext, SECRET_A);
    expect(decryptDisputeReason(envelope, SECRET_A)).toBe(plaintext);
  });

  it("round-trips long content", () => {
    const plaintext = "A".repeat(5000);
    const envelope = encryptDisputeReason(plaintext, SECRET_A);
    expect(decryptDisputeReason(envelope, SECRET_A)).toBe(plaintext);
  });

  it("produces a 3-part base64 envelope: iv:authTag:ciphertext", () => {
    const envelope = encryptDisputeReason("reason", SECRET_A);
    const parts = envelope.split(":");
    expect(parts).toHaveLength(3);
    for (const part of parts) {
      expect(() => Buffer.from(part, "base64")).not.toThrow();
    }
    // IV is 12 bytes, auth tag is 16 bytes for AES-GCM.
    expect(Buffer.from(parts[0]!, "base64").length).toBe(12);
    expect(Buffer.from(parts[1]!, "base64").length).toBe(16);
  });

  it("produces a different ciphertext (and IV) each time for the same plaintext", () => {
    const envelope1 = encryptDisputeReason("same reason", SECRET_A);
    const envelope2 = encryptDisputeReason("same reason", SECRET_A);
    expect(envelope1).not.toBe(envelope2);
  });

  it("never contains the plaintext as a substring of the envelope", () => {
    const plaintext = "super-secret-dispute-reason-marker";
    const envelope = encryptDisputeReason(plaintext, SECRET_A);
    expect(envelope).not.toContain(plaintext);
  });
});

describe("decryptDisputeReason failure handling", () => {
  it("throws DisputeDecryptionError (not a raw crypto error) when decrypting with the wrong key", () => {
    const envelope = encryptDisputeReason("top secret dispute reason", SECRET_A);

    let caught: unknown;
    try {
      decryptDisputeReason(envelope, SECRET_B);
    } catch (err) {
      caught = err;
    }

    expect(caught).toBeInstanceOf(DisputeDecryptionError);
    expect((caught as Error).message).toMatch(/wrong key|corrupted|tampered/i);
  });

  it("does not throw an unhandled/uncaught error for a wrong key -- caller can catch it", () => {
    const envelope = encryptDisputeReason("reason", SECRET_A);
    expect(() => decryptDisputeReason(envelope, SECRET_B)).toThrow(DisputeDecryptionError);
  });

  it("throws DisputeDecryptionError for a tampered ciphertext", () => {
    const envelope = encryptDisputeReason("reason", SECRET_A);
    const [iv, authTag, ciphertext] = envelope.split(":") as [string, string, string];
    const tamperedBytes = Buffer.from(ciphertext, "base64");
    tamperedBytes[0] = (tamperedBytes[0] ?? 0) ^ 0xff;
    const tamperedEnvelope = [iv, authTag, tamperedBytes.toString("base64")].join(":");

    expect(() => decryptDisputeReason(tamperedEnvelope, SECRET_A)).toThrow(DisputeDecryptionError);
  });

  it("throws DisputeDecryptionError for a tampered auth tag", () => {
    const envelope = encryptDisputeReason("reason", SECRET_A);
    const [iv, authTag, ciphertext] = envelope.split(":") as [string, string, string];
    const tamperedTag = Buffer.from(authTag, "base64");
    tamperedTag[0] = (tamperedTag[0] ?? 0) ^ 0xff;
    const tamperedEnvelope = [iv, tamperedTag.toString("base64"), ciphertext].join(":");

    expect(() => decryptDisputeReason(tamperedEnvelope, SECRET_A)).toThrow(DisputeDecryptionError);
  });

  it("throws DisputeDecryptionError for a malformed envelope (wrong number of segments)", () => {
    expect(() => decryptDisputeReason("not-a-valid-envelope", SECRET_A)).toThrow(
      DisputeDecryptionError
    );
    expect(() => decryptDisputeReason("a:b", SECRET_A)).toThrow(DisputeDecryptionError);
    expect(() => decryptDisputeReason("a:b:c:d", SECRET_A)).toThrow(DisputeDecryptionError);
  });

  it("throws DisputeDecryptionError for non-base64 segments", () => {
    expect(() => decryptDisputeReason("!!!:!!!:!!!", SECRET_A)).toThrow(DisputeDecryptionError);
  });
});
