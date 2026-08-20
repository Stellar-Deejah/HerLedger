import { describe, it, expect } from "vitest";
import {
  registrationFlowReducer,
  initialRegistrationFlowState,
  type RegistrationFlowState,
} from "../use-registration-flow";

function state(overrides: Partial<RegistrationFlowState> = {}): RegistrationFlowState {
  return { ...initialRegistrationFlowState, ...overrides };
}

describe("registrationFlowReducer: forward transitions", () => {
  it("wallet -> details on WALLET_CONNECTED", () => {
    const next = registrationFlowReducer(state({ step: "wallet" }), {
      type: "WALLET_CONNECTED",
      walletAddress: "GABC123",
    });
    expect(next.step).toBe("details");
    expect(next.walletAddress).toBe("GABC123");
  });

  it("details -> submitting on SUBMIT_STARTED when wallet is connected", () => {
    const next = registrationFlowReducer(
      state({ step: "details", walletAddress: "GABC123", businessName: "Acme" }),
      { type: "SUBMIT_STARTED" }
    );
    expect(next.step).toBe("submitting");
    expect(next.error).toBeNull();
  });

  it("submitting -> confirmed on SUBMIT_SUCCEEDED", () => {
    const next = registrationFlowReducer(state({ step: "submitting", walletAddress: "GABC123" }), {
      type: "SUBMIT_SUCCEEDED",
      txHash: "tx-1",
    });
    expect(next.step).toBe("confirmed");
    expect(next.txHash).toBe("tx-1");
  });

  it("submitting -> error on SUBMIT_FAILED", () => {
    const next = registrationFlowReducer(state({ step: "submitting", walletAddress: "GABC123" }), {
      type: "SUBMIT_FAILED",
      error: "boom",
    });
    expect(next.step).toBe("error");
    expect(next.error).toBe("boom");
  });

  it("updates businessName via BUSINESS_NAME_CHANGED", () => {
    const next = registrationFlowReducer(state({ step: "details" }), {
      type: "BUSINESS_NAME_CHANGED",
      businessName: "New Name",
    });
    expect(next.businessName).toBe("New Name");
  });
});

describe("registrationFlowReducer: retry / back-navigation", () => {
  it("error -> details on RETRY_REQUESTED when a wallet is still connected", () => {
    const next = registrationFlowReducer(
      state({ step: "error", walletAddress: "GABC123", error: "boom" }),
      { type: "RETRY_REQUESTED" }
    );
    expect(next.step).toBe("details");
    expect(next.error).toBeNull();
  });

  it("error -> wallet on RETRY_REQUESTED when no wallet is connected", () => {
    const next = registrationFlowReducer(state({ step: "error", walletAddress: null, error: "boom" }), {
      type: "RETRY_REQUESTED",
    });
    expect(next.step).toBe("wallet");
  });

  it("ignores RETRY_REQUESTED from any step other than error", () => {
    for (const step of ["wallet", "details", "submitting", "confirmed"] as const) {
      const s = state({ step, walletAddress: "GABC123" });
      expect(registrationFlowReducer(s, { type: "RETRY_REQUESTED" })).toEqual(s);
    }
  });
});

describe("registrationFlowReducer: guards against invalid transitions", () => {
  it("cannot leave the confirmed step via any action (terminal state)", () => {
    const confirmed = state({ step: "confirmed", walletAddress: "GABC123", txHash: "tx-1" });
    const actions: Parameters<typeof registrationFlowReducer>[1][] = [
      { type: "WALLET_CONNECTED", walletAddress: "GXYZ999" },
      { type: "BUSINESS_NAME_CHANGED", businessName: "Other" },
      { type: "SUBMIT_STARTED" },
      { type: "SUBMIT_SUCCEEDED", txHash: "tx-2" },
      { type: "SUBMIT_FAILED", error: "boom" },
      { type: "RETRY_REQUESTED" },
    ];
    for (const action of actions) {
      expect(registrationFlowReducer(confirmed, action)).toEqual(confirmed);
    }
  });

  it("cannot SUBMIT_STARTED without a connected wallet, even from details", () => {
    const s = state({ step: "details", walletAddress: null });
    expect(registrationFlowReducer(s, { type: "SUBMIT_STARTED" })).toEqual(s);
  });

  it("cannot SUBMIT_STARTED from wallet step (skips details entirely)", () => {
    const s = state({ step: "wallet", walletAddress: "GABC123" });
    expect(registrationFlowReducer(s, { type: "SUBMIT_STARTED" })).toEqual(s);
  });

  it("ignores WALLET_CONNECTED while a submission is in flight", () => {
    const s = state({ step: "submitting", walletAddress: "GABC123" });
    const next = registrationFlowReducer(s, { type: "WALLET_CONNECTED", walletAddress: "GNEW" });
    expect(next).toEqual(s);
  });

  it("ignores BUSINESS_NAME_CHANGED while a submission is in flight", () => {
    const s = state({ step: "submitting", walletAddress: "GABC123", businessName: "Locked" });
    const next = registrationFlowReducer(s, {
      type: "BUSINESS_NAME_CHANGED",
      businessName: "Should not apply",
    });
    expect(next).toEqual(s);
  });

  it("ignores SUBMIT_SUCCEEDED unless a submission is actually in flight", () => {
    for (const step of ["wallet", "details", "error"] as const) {
      const s = state({ step, walletAddress: "GABC123" });
      expect(registrationFlowReducer(s, { type: "SUBMIT_SUCCEEDED", txHash: "tx-1" })).toEqual(s);
    }
  });

  it("ignores SUBMIT_FAILED unless a submission is actually in flight", () => {
    for (const step of ["wallet", "details", "error"] as const) {
      const s = state({ step, walletAddress: "GABC123" });
      expect(registrationFlowReducer(s, { type: "SUBMIT_FAILED", error: "boom" })).toEqual(s);
    }
  });
});
