import { describe, it, expect } from "vitest";

import { RequestSchema } from "../schema";

const VALID_WALLET = "G".repeat(56);
const VALID_HASH = "a".repeat(64);

describe("register-attester RequestSchema", () => {
  it("accepts a valid registration payload", () => {
    const result = RequestSchema.safeParse({
      walletAddress: VALID_WALLET,
      displayName: "Acme Auditing",
      description: "Independent auditing firm",
      metadataHash: VALID_HASH,
      txHash: "deadbeef",
    });
    expect(result.success).toBe(true);
  });

  it("allows description to be omitted", () => {
    const result = RequestSchema.safeParse({
      walletAddress: VALID_WALLET,
      displayName: "Acme Auditing",
      metadataHash: VALID_HASH,
      txHash: "deadbeef",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a walletAddress that isn't 56 characters", () => {
    const result = RequestSchema.safeParse({
      walletAddress: "GTOOSHORT",
      displayName: "Acme Auditing",
      metadataHash: VALID_HASH,
      txHash: "deadbeef",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a metadataHash that isn't 64 characters", () => {
    const result = RequestSchema.safeParse({
      walletAddress: VALID_WALLET,
      displayName: "Acme Auditing",
      metadataHash: "tooShort",
      txHash: "deadbeef",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an empty displayName", () => {
    const result = RequestSchema.safeParse({
      walletAddress: VALID_WALLET,
      displayName: "",
      metadataHash: VALID_HASH,
      txHash: "deadbeef",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a missing txHash", () => {
    const result = RequestSchema.safeParse({
      walletAddress: VALID_WALLET,
      displayName: "Acme Auditing",
      metadataHash: VALID_HASH,
    });
    expect(result.success).toBe(false);
  });
});
