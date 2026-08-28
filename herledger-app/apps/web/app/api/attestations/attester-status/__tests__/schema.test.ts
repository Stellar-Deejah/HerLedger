import { describe, it, expect } from "vitest";

import { RequestSchema } from "../schema";

describe("attester-status RequestSchema", () => {
  it("accepts a valid 56-character wallet address", () => {
    const result = RequestSchema.safeParse({ walletAddress: "G".repeat(56) });
    expect(result.success).toBe(true);
  });

  it("rejects a missing walletAddress", () => {
    const result = RequestSchema.safeParse({ walletAddress: undefined });
    expect(result.success).toBe(false);
  });

  it("rejects a walletAddress shorter than 56 characters", () => {
    const result = RequestSchema.safeParse({ walletAddress: "GTOOSHORT" });
    expect(result.success).toBe(false);
  });
});
