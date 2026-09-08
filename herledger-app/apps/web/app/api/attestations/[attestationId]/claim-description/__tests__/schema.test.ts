import { describe, it, expect } from "vitest";

import { RequestSchema } from "../schema";

const VALID_HASH64 = "a".repeat(64);
const VALID_WALLET = "G".repeat(56);

describe("claim-description RequestSchema", () => {
  it("accepts a valid claim description payload", () => {
    const result = RequestSchema.safeParse({
      eventId: VALID_HASH64,
      attesterAddress: VALID_WALLET,
      claimHash: VALID_HASH64,
      claimDescription: "Invoice verified against bank statement",
      ledgerSequence: 12345,
    });
    expect(result.success).toBe(true);
  });

  it("defaults ledgerSequence to 0 when omitted", () => {
    const result = RequestSchema.parse({
      eventId: VALID_HASH64,
      attesterAddress: VALID_WALLET,
      claimHash: VALID_HASH64,
      claimDescription: "Invoice verified",
    });
    expect(result.ledgerSequence).toBe(0);
  });

  it("rejects an empty claimDescription", () => {
    const result = RequestSchema.safeParse({
      eventId: VALID_HASH64,
      attesterAddress: VALID_WALLET,
      claimHash: VALID_HASH64,
      claimDescription: "",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an eventId that isn't 64 hex characters", () => {
    const result = RequestSchema.safeParse({
      eventId: "tooShort",
      attesterAddress: VALID_WALLET,
      claimHash: VALID_HASH64,
      claimDescription: "Invoice verified",
    });
    expect(result.success).toBe(false);
  });

  it("rejects a negative ledgerSequence", () => {
    const result = RequestSchema.safeParse({
      eventId: VALID_HASH64,
      attesterAddress: VALID_WALLET,
      claimHash: VALID_HASH64,
      claimDescription: "Invoice verified",
      ledgerSequence: -1,
    });
    expect(result.success).toBe(false);
  });
});
