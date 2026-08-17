import { describe, it, expect } from "vitest";
import { Keypair } from "@stellar/stellar-sdk";
import {
  buildWalletLinkChallengeMessage,
  generateWalletLinkNonce,
  isWalletLinkChallengeExpired,
  verifyWalletLinkChallengeSignature,
  WALLET_LINK_CHALLENGE_TTL_MS,
} from "../challenge.js";
import type { WalletLinkChallengeParams } from "../challenge.js";

// Freighter's signMessage ultimately signs with the wallet's Ed25519 key —
// these tests exercise the actual crypto (via a real Keypair, standing in
// for what the Freighter extension would produce) rather than mocking
// signature verification away.
function sign(message: string, keypair: Keypair): string {
  return keypair.sign(Buffer.from(message, "utf8")).toString("base64");
}

function makeParams(overrides: Partial<WalletLinkChallengeParams> = {}): WalletLinkChallengeParams {
  return {
    businessId: "b".repeat(64),
    walletAddress: Keypair.random().publicKey(),
    nonce: generateWalletLinkNonce(),
    issuedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("buildWalletLinkChallengeMessage", () => {
  it("includes every binding field in the message", () => {
    const params = makeParams();
    const message = buildWalletLinkChallengeMessage(params);

    expect(message).toContain(params.businessId);
    expect(message).toContain(params.walletAddress);
    expect(message).toContain(params.nonce);
    expect(message).toContain(params.issuedAt);
  });

  it("is deterministic for identical params", () => {
    const params = makeParams();
    expect(buildWalletLinkChallengeMessage(params)).toBe(
      buildWalletLinkChallengeMessage({ ...params })
    );
  });

  it("produces a different message when the nonce changes", () => {
    const params = makeParams();
    const other = buildWalletLinkChallengeMessage({ ...params, nonce: generateWalletLinkNonce() });
    expect(buildWalletLinkChallengeMessage(params)).not.toBe(other);
  });
});

describe("generateWalletLinkNonce", () => {
  it("produces unique nonces", () => {
    const nonces = new Set(Array.from({ length: 20 }, () => generateWalletLinkNonce()));
    expect(nonces.size).toBe(20);
  });
});

describe("wallet re-link challenge verification", () => {
  it("accepts a signature produced by the claimed wallet's own key", () => {
    const keypair = Keypair.random();
    const params = makeParams({ walletAddress: keypair.publicKey() });
    const message = buildWalletLinkChallengeMessage(params);
    const signature = sign(message, keypair);

    expect(verifyWalletLinkChallengeSignature(message, signature, params.walletAddress)).toBe(true);
  });

  it("rejects a signature produced by a different wallet's key", () => {
    const owner = Keypair.random();
    const impostor = Keypair.random();
    const params = makeParams({ walletAddress: owner.publicKey() });
    const message = buildWalletLinkChallengeMessage(params);
    const signature = sign(message, impostor);

    expect(verifyWalletLinkChallengeSignature(message, signature, params.walletAddress)).toBe(
      false
    );
  });

  it("rejects a valid signature over a tampered message (different business ID)", () => {
    const keypair = Keypair.random();
    const params = makeParams({ walletAddress: keypair.publicKey() });
    const message = buildWalletLinkChallengeMessage(params);
    const signature = sign(message, keypair);

    const tamperedMessage = buildWalletLinkChallengeMessage({
      ...params,
      businessId: "f".repeat(64),
    });

    expect(
      verifyWalletLinkChallengeSignature(tamperedMessage, signature, params.walletAddress)
    ).toBe(false);
  });

  it("rejects a signature replayed against a different nonce (message swapped after signing)", () => {
    const keypair = Keypair.random();
    const params = makeParams({ walletAddress: keypair.publicKey() });
    const originalMessage = buildWalletLinkChallengeMessage(params);
    const signature = sign(originalMessage, keypair);

    const replayedMessage = buildWalletLinkChallengeMessage({
      ...params,
      nonce: generateWalletLinkNonce(),
    });

    expect(
      verifyWalletLinkChallengeSignature(replayedMessage, signature, params.walletAddress)
    ).toBe(false);
  });

  it("returns false, not throw, for a malformed base64 signature", () => {
    const params = makeParams();
    const message = buildWalletLinkChallengeMessage(params);
    expect(() =>
      verifyWalletLinkChallengeSignature(message, "not-valid-base64!!", params.walletAddress)
    ).not.toThrow();
    expect(
      verifyWalletLinkChallengeSignature(message, "not-valid-base64!!", params.walletAddress)
    ).toBe(false);
  });

  it("returns false, not throw, for a malformed wallet address", () => {
    const keypair = Keypair.random();
    const params = makeParams({ walletAddress: keypair.publicKey() });
    const message = buildWalletLinkChallengeMessage(params);
    const signature = sign(message, keypair);

    expect(() =>
      verifyWalletLinkChallengeSignature(message, signature, "not-an-address")
    ).not.toThrow();
    expect(verifyWalletLinkChallengeSignature(message, signature, "not-an-address")).toBe(false);
  });
});

describe("isWalletLinkChallengeExpired", () => {
  it("is not expired immediately after issuance", () => {
    expect(isWalletLinkChallengeExpired(new Date().toISOString())).toBe(false);
  });

  it("is expired once the TTL has elapsed", () => {
    const issuedAt = new Date(Date.now() - (WALLET_LINK_CHALLENGE_TTL_MS + 1_000)).toISOString();
    expect(isWalletLinkChallengeExpired(issuedAt)).toBe(true);
  });

  it("respects a custom TTL", () => {
    const issuedAt = new Date(Date.now() - 10_000).toISOString();
    expect(isWalletLinkChallengeExpired(issuedAt, 5_000)).toBe(true);
    expect(isWalletLinkChallengeExpired(issuedAt, 60_000)).toBe(false);
  });

  it("treats an unparsable timestamp as expired", () => {
    expect(isWalletLinkChallengeExpired("not-a-date")).toBe(true);
  });
});
