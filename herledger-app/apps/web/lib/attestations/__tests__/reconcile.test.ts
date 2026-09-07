import { describe, it, expect } from "vitest";

import { hasStatusDiscrepancy } from "../reconcile";

describe("hasStatusDiscrepancy", () => {
  it("reports no discrepancy when DB says Active and on-chain agrees", () => {
    expect(hasStatusDiscrepancy("Active", true)).toBe(false);
  });

  it("reports no discrepancy when DB says Revoked and on-chain agrees", () => {
    expect(hasStatusDiscrepancy("Revoked", false)).toBe(false);
  });

  it("reports a discrepancy when DB says Active but on-chain says revoked", () => {
    expect(hasStatusDiscrepancy("Active", false)).toBe(true);
  });

  it("reports a discrepancy when DB says Revoked but on-chain says valid", () => {
    expect(hasStatusDiscrepancy("Revoked", true)).toBe(true);
  });
});
