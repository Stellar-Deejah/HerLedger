import { describe, it, expect } from "vitest";
import {
  generatePersonalAccessToken,
  hashPersonalAccessToken,
  verifyPersonalAccessTokenHash,
} from "../tokens.js";

const PEPPER = "test-pepper-value-not-a-real-secret-32chars";
const OTHER_PEPPER = "a-different-pepper-value-also-32-chars-long";

describe("generatePersonalAccessToken", () => {
  it("produces a token with the hl_pat_ prefix", () => {
    const { token } = generatePersonalAccessToken();
    expect(token.startsWith("hl_pat_")).toBe(true);
  });

  it("produces a display prefix that is itself a prefix of the token", () => {
    const { token, prefix } = generatePersonalAccessToken();
    expect(token.startsWith(prefix)).toBe(true);
    expect(prefix.length).toBeLessThan(token.length);
  });

  it("never includes the full token in the display prefix", () => {
    const { token, prefix } = generatePersonalAccessToken();
    expect(prefix).not.toBe(token);
  });

  it("generates unique, high-entropy tokens on each call", () => {
    const tokens = new Set(Array.from({ length: 50 }, () => generatePersonalAccessToken().token));
    expect(tokens.size).toBe(50);
  });
});

describe("hashPersonalAccessToken", () => {
  it("is deterministic for the same token and pepper", () => {
    const { token } = generatePersonalAccessToken();
    expect(hashPersonalAccessToken(token, PEPPER)).toBe(hashPersonalAccessToken(token, PEPPER));
  });

  it("produces a 64-character hex SHA-256 digest", () => {
    const { token } = generatePersonalAccessToken();
    const hash = hashPersonalAccessToken(token, PEPPER);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it("never stores or reproduces the plaintext token in the hash", () => {
    const { token } = generatePersonalAccessToken();
    const hash = hashPersonalAccessToken(token, PEPPER);
    expect(hash).not.toContain(token);
  });

  it("produces different hashes for different tokens", () => {
    const a = generatePersonalAccessToken().token;
    const b = generatePersonalAccessToken().token;
    expect(hashPersonalAccessToken(a, PEPPER)).not.toBe(hashPersonalAccessToken(b, PEPPER));
  });

  it("produces different hashes for the same token under different peppers", () => {
    const { token } = generatePersonalAccessToken();
    expect(hashPersonalAccessToken(token, PEPPER)).not.toBe(
      hashPersonalAccessToken(token, OTHER_PEPPER)
    );
  });
});

describe("verifyPersonalAccessTokenHash", () => {
  it("accepts the correct token against its stored hash", () => {
    const { token } = generatePersonalAccessToken();
    const stored = hashPersonalAccessToken(token, PEPPER);
    expect(verifyPersonalAccessTokenHash(token, PEPPER, stored)).toBe(true);
  });

  it("rejects a token that does not match the stored hash", () => {
    const { token: real } = generatePersonalAccessToken();
    const { token: forged } = generatePersonalAccessToken();
    const stored = hashPersonalAccessToken(real, PEPPER);
    expect(verifyPersonalAccessTokenHash(forged, PEPPER, stored)).toBe(false);
  });

  it("rejects the correct token if verified under the wrong pepper", () => {
    const { token } = generatePersonalAccessToken();
    const stored = hashPersonalAccessToken(token, PEPPER);
    expect(verifyPersonalAccessTokenHash(token, OTHER_PEPPER, stored)).toBe(false);
  });

  it("rejects a revoked/malformed stored hash instead of throwing", () => {
    const { token } = generatePersonalAccessToken();
    expect(verifyPersonalAccessTokenHash(token, PEPPER, "not-hex")).toBe(false);
  });

  it("rejects an empty stored hash instead of throwing", () => {
    const { token } = generatePersonalAccessToken();
    expect(verifyPersonalAccessTokenHash(token, PEPPER, "")).toBe(false);
  });
});
