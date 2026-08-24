import type { EventStatus } from "@herledger/sdk";
import { describe, it, expect } from "vitest";

import {
  deriveDisputeLifecycleStatus,
  isDisputeTerminal,
  DISPUTE_STATUS_LABELS,
  type DisputeStatus,
} from "../status";

describe("deriveDisputeLifecycleStatus", () => {
  it("forces Resolved when the on-chain event has been Verified, regardless of stored status", () => {
    const storedStatuses: DisputeStatus[] = ["Submitted", "Investigating", "Resolved", "Revoked"];
    for (const stored of storedStatuses) {
      expect(deriveDisputeLifecycleStatus("Verified", stored)).toBe("Resolved");
    }
  });

  it("forces Revoked when the on-chain event has been Revoked, regardless of stored status", () => {
    const storedStatuses: DisputeStatus[] = ["Submitted", "Investigating", "Resolved", "Revoked"];
    for (const stored of storedStatuses) {
      expect(deriveDisputeLifecycleStatus("Revoked", stored)).toBe("Revoked");
    }
  });

  it("keeps the stored status while the event is still Disputed on-chain", () => {
    expect(deriveDisputeLifecycleStatus("Disputed", "Submitted")).toBe("Submitted");
    expect(deriveDisputeLifecycleStatus("Disputed", "Investigating")).toBe("Investigating");
  });

  it("keeps the stored status when the event is Pending (should not normally occur)", () => {
    expect(deriveDisputeLifecycleStatus("Pending", "Submitted")).toBe("Submitted");
  });

  it("is a pure function -- same inputs always produce the same output", () => {
    const eventStatuses: EventStatus[] = ["Pending", "Verified", "Disputed", "Revoked"];
    const storedStatuses: DisputeStatus[] = ["Submitted", "Investigating", "Resolved", "Revoked"];
    for (const es of eventStatuses) {
      for (const ds of storedStatuses) {
        expect(deriveDisputeLifecycleStatus(es, ds)).toBe(deriveDisputeLifecycleStatus(es, ds));
      }
    }
  });
});

describe("isDisputeTerminal", () => {
  it("treats Resolved and Revoked as terminal", () => {
    expect(isDisputeTerminal("Resolved")).toBe(true);
    expect(isDisputeTerminal("Revoked")).toBe(true);
  });

  it("treats Submitted and Investigating as non-terminal", () => {
    expect(isDisputeTerminal("Submitted")).toBe(false);
    expect(isDisputeTerminal("Investigating")).toBe(false);
  });
});

describe("DISPUTE_STATUS_LABELS", () => {
  it("has an entry for every DisputeStatus", () => {
    const statuses: DisputeStatus[] = ["Submitted", "Investigating", "Resolved", "Revoked"];
    for (const status of statuses) {
      expect(DISPUTE_STATUS_LABELS[status]).toBeDefined();
      expect(DISPUTE_STATUS_LABELS[status].label).toBe(status);
    }
  });
});
