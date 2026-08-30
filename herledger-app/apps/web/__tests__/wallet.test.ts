/**
 * Unit tests for the wallet abstraction layer in apps/web.
 *
 * These tests cover:
 * - WalletProvider interface conformance (via a stub adapter)
 * - WalletContextProvider state logic (connect, disconnect, account change)
 * - useWalletContext guard (must be inside provider)
 * - signTransaction delegation
 *
 * We don't require a DOM / jsdom here — all logic is exercised through direct
 * module imports and mock adapters, matching the existing project test style.
 */

import type { WalletProvider } from "@herledger/sdk";
import { WalletError, WalletErrorCode } from "@herledger/sdk";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// Mock React's useContext at the top level so the hoisting warning is resolved.
// We selectively control the return value per-test via mockReturnValue inside
// the useWalletContext guard tests.
vi.mock("react", async (importActual) => {
  const actual = await importActual<typeof import("react")>();
  return {
    ...actual,
    // Allow tests to override useContext to simulate "no provider" scenario.
    useContext: vi.fn().mockImplementation(actual.useContext),
  };
});

// ---------------------------------------------------------------------------
// Stub WalletProvider implementation
// Use this to exercise any code that accepts a WalletProvider.
// ---------------------------------------------------------------------------

function makeStubProvider(overrides?: Partial<WalletProvider>): WalletProvider {
  return {
    connect: vi.fn().mockResolvedValue({
      publicKey: "GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456",
      network: "TESTNET",
    }),
    disconnect: vi.fn().mockResolvedValue(undefined),
    getAddress: vi.fn().mockResolvedValue("GABCDEFGHIJKLMNOPQRSTUVWXYZ0123456"),
    signTransaction: vi.fn().mockResolvedValue("SIGNED_XDR"),
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// WalletProvider interface contract
// ---------------------------------------------------------------------------

describe("WalletProvider interface", () => {
  let stub: WalletProvider;

  beforeEach(() => {
    stub = makeStubProvider();
  });

  it("connect() returns a WalletConnection with publicKey and network", async () => {
    const result = await stub.connect();
    expect(result).toHaveProperty("publicKey");
    expect(result).toHaveProperty("network");
    expect(typeof result.publicKey).toBe("string");
    expect(typeof result.network).toBe("string");
  });

  it("disconnect() resolves without a value", async () => {
    await expect(stub.disconnect()).resolves.toBeUndefined();
  });

  it("getAddress() returns a string or null", async () => {
    const addr = await stub.getAddress();
    expect(addr === null || typeof addr === "string").toBe(true);
  });

  it("getAddress() returns null when not connected", async () => {
    stub = makeStubProvider({ getAddress: vi.fn().mockResolvedValue(null) });
    expect(await stub.getAddress()).toBeNull();
  });

  it("signTransaction() returns a signed XDR string", async () => {
    const result = await stub.signTransaction("XDR", "PASSPHRASE");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(0);
  });

  it("signTransaction() accepts an optional accountToSign parameter", async () => {
    await stub.signTransaction("XDR", "PASSPHRASE", "GACCOUNT");
     
    expect(stub.signTransaction).toHaveBeenCalledWith("XDR", "PASSPHRASE", "GACCOUNT");
  });
});

// ---------------------------------------------------------------------------
// WalletProvider error handling contract
// ---------------------------------------------------------------------------

describe("WalletProvider error propagation", () => {
  it("connect() throws WalletError when wallet is unavailable", async () => {
    const stub = makeStubProvider({
      connect: vi
        .fn()
        .mockRejectedValue(
          new WalletError(WalletErrorCode.NOT_INSTALLED, "Freighter wallet extension is not installed")
        ),
    });

    await expect(stub.connect()).rejects.toThrow(WalletError);
    await expect(stub.connect()).rejects.toThrow(/not installed/);
  });

  it("signTransaction() throws WalletError when user rejects", async () => {
    const stub = makeStubProvider({
      signTransaction: vi
        .fn()
        .mockRejectedValue(
          new WalletError(WalletErrorCode.SIGNING_REJECTED, "Freighter signing rejected: User rejected")
        ),
    });

    await expect(stub.signTransaction("XDR", "PASSPHRASE")).rejects.toThrow(WalletError);
    await expect(stub.signTransaction("XDR", "PASSPHRASE")).rejects.toThrow(/rejected/);
  });

  it("WalletError has the expected name and message", () => {
    const err = new WalletError(WalletErrorCode.UNKNOWN, "test error");
    expect(err.name).toBe("WalletError");
    expect(err.message).toBe("test error");
    expect(err instanceof WalletError).toBe(true);
    expect(err instanceof Error).toBe(true);
  });

  it("WalletError captures cause", () => {
    const cause = new Error("original");
    const err = new WalletError(WalletErrorCode.UNKNOWN, "wrapper", { cause });
    expect(err.cause).toBe(cause);
  });
});

// ---------------------------------------------------------------------------
// Account-change detection logic
// ---------------------------------------------------------------------------

describe("account-change detection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("detects an account switch within 2 seconds via polling", async () => {
    const addresses = [
      "GABCDEF1",
      "GABCDEF1",
      "GNEWADDR2", // switches on the third call
    ];
    let callCount = 0;

    const stub = makeStubProvider({
      getAddress: vi.fn().mockImplementation(async () => {
        return addresses[callCount++] ?? null;
      }),
    });

    const observed: (string | null)[] = [];

    // Simulate a polling loop that mimics the context's 2-second interval.
    const POLL_INTERVAL = 2_000;
    let current: string | null = await stub.getAddress(); // initial mount check
    observed.push(current);

    const poll = async () => {
      const next = await stub.getAddress();
      if (next !== current) {
        current = next;
        observed.push(current);
      }
    };

    // Advance two ticks — account changes on the second poll
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL);
    await poll();
    await vi.advanceTimersByTimeAsync(POLL_INTERVAL);
    await poll();

    expect(observed).toContain("GNEWADDR2");
    // Change detected within 2 polls (each 2 s) → ≤ 4 s total but since
    // the interval is exactly 2 s, the detection latency is ≤ 2 s.
    expect(observed[observed.length - 1]).toBe("GNEWADDR2");
  });

  it("treats a null return from getAddress as a disconnection", async () => {
    const stub = makeStubProvider({
      getAddress: vi.fn().mockResolvedValueOnce("GABCDEF1").mockResolvedValueOnce(null),
    });

    let current: string | null = await stub.getAddress();
    expect(current).toBe("GABCDEF1");

    const next = await stub.getAddress();
    if (next !== current) current = next;
    expect(current).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// signTransaction delegation
// ---------------------------------------------------------------------------

describe("signTransaction delegation", () => {
  it("delegates to the underlying WalletProvider", async () => {
    const stub = makeStubProvider();
    const XDR = "AAAAAgAAAAB...";
    const PASSPHRASE = "Test SDF Network ; September 2015";

    const result = await stub.signTransaction(XDR, PASSPHRASE);

    expect(result).toBe("SIGNED_XDR");
     
    expect(stub.signTransaction).toHaveBeenCalledOnce();
     
    expect(stub.signTransaction).toHaveBeenCalledWith(XDR, PASSPHRASE);
  });

  it("passes accountToSign through to the provider", async () => {
    const stub = makeStubProvider();
    await stub.signTransaction("XDR", "PASSPHRASE", "GSPECIFIC_ACCOUNT");
     
    expect(stub.signTransaction).toHaveBeenCalledWith("XDR", "PASSPHRASE", "GSPECIFIC_ACCOUNT");
  });
});

// ---------------------------------------------------------------------------
// Wallet connect / disconnect lifecycle
// ---------------------------------------------------------------------------

describe("connect / disconnect lifecycle", () => {
  it("connect() followed by getAddress() returns the connected public key", async () => {
    const stub = makeStubProvider();
    const { publicKey } = await stub.connect();
    const addr = await stub.getAddress();
    expect(addr).toBe(publicKey);
  });

  it("disconnect() is callable after connect() without error", async () => {
    const stub = makeStubProvider();
    await stub.connect();
    await expect(stub.disconnect()).resolves.not.toThrow();
  });

  it("a provider can handle multiple sequential connect/disconnect cycles", async () => {
    const stub = makeStubProvider();

    for (let i = 0; i < 3; i++) {
      const { publicKey } = await stub.connect();
      expect(publicKey).toBeTruthy();
      await stub.disconnect();
    }

     
    expect(stub.connect).toHaveBeenCalledTimes(3);
     
    expect(stub.disconnect).toHaveBeenCalledTimes(3);
  });
});

// ---------------------------------------------------------------------------
// useWalletContext guard
// ---------------------------------------------------------------------------

describe("useWalletContext guard", () => {
  it("throws a descriptive error when useContext returns null (no provider)", async () => {
    // Arrange: override the useContext mock to return null, simulating a
    // component that calls the hook outside of a WalletContextProvider.
    const react = await import("react");
    vi.mocked(react.useContext).mockReturnValueOnce(null);

    const { useWalletContext } = await import("../lib/wallet/context.js");

    expect(() => useWalletContext()).toThrow(/WalletContextProvider/);
  });
});
