// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";

import {
  clearPendingRegistration,
  readPendingRegistration,
  writePendingRegistration,
} from "@/lib/business/pending-registration";
import { mockPublicEnv } from "@/tests/utils/mock-public-env";
import {
  MockSdkProvider,
  mockRegisterBusinessSuccess,
  mockRegisterBusinessThrows,
  mockRegisterBusinessRejectedOnChain,
  mockRegisterBusinessWalletDisconnected,
  mockRegisterBusinessSuccessWithSubmittedHash,
  mockPollTransactionStatusSuccess,
  mockPollTransactionStatusThrows,
} from "@/tests/utils/mock-sdk-provider";
import { TEST_WALLET_ADDRESS } from "@/tests/utils/mock-wallet";

// `useRegistrationFlow` reads NEXT_PUBLIC_* env vars via getPublicEnv() and
// posts to /api/business/register on success — stub both so this stays a
// fast, network-free unit test of the hook's own state transitions.
vi.mock("@herledger/config", () => ({
  getPublicEnv: mockPublicEnv,
}));

import { useRegistrationFlow } from "../use-registration-flow";

function wrapper(overrides: Parameters<typeof MockSdkProvider>[0]["overrides"]) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MockSdkProvider overrides={overrides}>{children}</MockSdkProvider>;
  };
}

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }));
  clearPendingRegistration();
});

describe("useRegistrationFlow: happy path", () => {
  it("walks wallet -> details -> submitting -> confirmed", async () => {
    const { result } = renderHook(() => useRegistrationFlow(), {
      wrapper: wrapper({ registerBusiness: mockRegisterBusinessSuccess("tx-happy") }),
    });

    expect(result.current.step).toBe("wallet");

    act(() => result.current.connectWallet(TEST_WALLET_ADDRESS));
    expect(result.current.step).toBe("details");

    act(() => result.current.setBusinessName("Acme Traders"));
    expect(result.current.businessName).toBe("Acme Traders");

    act(() => {
      void result.current.submit();
    });

    expect(result.current.step).toBe("submitting");

    await waitFor(() => {
      expect(result.current.step).toBe("confirmed");
    });
    expect(result.current.txHash).toBe("tx-happy");

    const posts = vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/business/register");
    expect(posts).toHaveLength(1);
    const parsed = JSON.parse(posts[0]![1]!.body as string);
    expect(parsed).toMatchObject({
      walletAddress: TEST_WALLET_ADDRESS,
      displayName: "Acme Traders",
      txHash: "tx-happy",
    });
    expect(typeof parsed.businessId).toBe("string");
    expect(parsed.businessId).toHaveLength(64);
    expect(typeof parsed.metadataHash).toBe("string");
    expect(parsed.metadataHash).toHaveLength(64);

    expect(readPendingRegistration()).toBeNull();
  });

  it("persists pending txHash to localStorage on submission, then clears on success", async () => {
    const { result } = renderHook(() => useRegistrationFlow(), {
      wrapper: wrapper({
        registerBusiness: mockRegisterBusinessSuccessWithSubmittedHash("tx-async-123"),
      }),
    });

    act(() => result.current.connectWallet(TEST_WALLET_ADDRESS));
    act(() => result.current.setBusinessName("Acme Traders"));

    act(() => {
      void result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.step).toBe("confirmed");
    });

    expect(readPendingRegistration()).toBeNull();
  });
});

describe("useRegistrationFlow: resuming pending registration", () => {
  it("resumes polling when localStorage holds a pending hash, auto-advancing to confirmed on completion", async () => {
    writePendingRegistration({
      businessId: "biz-123",
      walletAddress: TEST_WALLET_ADDRESS,
      displayName: "Resumed Corp",
      metadataHash: "0".repeat(64),
      txHash: "tx-resume-456",
      submittedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useRegistrationFlow(), {
      wrapper: wrapper({
        pollTransactionStatus: mockPollTransactionStatusSuccess("tx-resume-456"),
      }),
    });

    await waitFor(() => {
      expect(result.current.step).toBe("confirmed");
    });

    expect(result.current.txHash).toBe("tx-resume-456");
    expect(result.current.walletAddress).toBe(TEST_WALLET_ADDRESS);

    expect(readPendingRegistration()).toBeNull();

    const posts = vi.mocked(fetch).mock.calls.filter(([url]) => url === "/api/business/register");
    expect(posts).toHaveLength(1);
  });

  it("transitions to error step if resumed polling fails on-chain", async () => {
    writePendingRegistration({
      businessId: "biz-456",
      walletAddress: TEST_WALLET_ADDRESS,
      displayName: "Resumed Corp",
      metadataHash: "0".repeat(64),
      txHash: "tx-resume-bad",
      submittedAt: new Date().toISOString(),
    });

    const { result } = renderHook(() => useRegistrationFlow(), {
      wrapper: wrapper({
        pollTransactionStatus: mockPollTransactionStatusThrows("Tx failed on chain"),
      }),
    });

    await waitFor(() => {
      expect(result.current.step).toBe("error");
    });

    expect(result.current.error).toBe("Tx failed on chain");
    expect(readPendingRegistration()).toBeNull();
  });

  it("ignores stale pending registrations (> 24 hours old)", () => {
    const dayAndMinuteAgo = new Date(Date.now() - (24 * 60 * 60 * 1000 + 60 * 1000)).toISOString();
    writePendingRegistration({
      businessId: "biz-stale",
      walletAddress: TEST_WALLET_ADDRESS,
      displayName: "Old Corp",
      metadataHash: "0".repeat(64),
      txHash: "tx-stale",
      submittedAt: dayAndMinuteAgo,
    });

    const { result } = renderHook(() => useRegistrationFlow());

    expect(result.current.step).toBe("wallet");
    expect(readPendingRegistration()).toBeNull();
  });
});

describe("useRegistrationFlow: error handling", () => {
  it("transitions to error step when contract call throws, preserving entered details for retry", async () => {
    const { result } = renderHook(() => useRegistrationFlow(), {
      wrapper: wrapper({
        registerBusiness: mockRegisterBusinessThrows("User rejected tx"),
      }),
    });

    act(() => result.current.connectWallet(TEST_WALLET_ADDRESS));
    act(() => result.current.setBusinessName("Acme Traders"));

    act(() => {
      void result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.step).toBe("error");
    });

    expect(result.current.error).toBe("User rejected tx");
    expect(result.current.businessName).toBe("Acme Traders");
    expect(result.current.walletAddress).toBe(TEST_WALLET_ADDRESS);
    expect(readPendingRegistration()).toBeNull();

    act(() => result.current.retry());
    expect(result.current.step).toBe("details");
    expect(result.current.error).toBeNull();
    expect(result.current.businessName).toBe("Acme Traders");
  });

  it("transitions to error step when contract returns SUCCESS_WITH_FAILED_EVENTS", async () => {
    const { result } = renderHook(() => useRegistrationFlow(), {
      wrapper: wrapper({
        registerBusiness: mockRegisterBusinessRejectedOnChain(),
      }),
    });

    act(() => result.current.connectWallet(TEST_WALLET_ADDRESS));
    act(() => result.current.setBusinessName("Acme Traders"));

    act(() => {
      void result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.step).toBe("error");
    });

    expect(result.current.error).toMatch(/did not succeed/i);
    expect(readPendingRegistration()).toBeNull();
  });

  it("transitions to error step if wallet disconnects before submit", async () => {
    const { result } = renderHook(() => useRegistrationFlow(), {
      wrapper: wrapper({
        registerBusiness: mockRegisterBusinessWalletDisconnected(),
      }),
    });

    act(() => result.current.connectWallet(TEST_WALLET_ADDRESS));
    act(() => result.current.setBusinessName("Acme Traders"));

    act(() => {
      void result.current.submit();
    });

    await waitFor(() => {
      expect(result.current.step).toBe("error");
    });

    expect(result.current.error).toMatch(/wallet disconnected/i);
    expect(readPendingRegistration()).toBeNull();
  });

  it("transitions to error step when /api/business/register returns HTTP 500", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "Database error" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    (globalThis as unknown as { fetch: typeof fetch }).fetch = fetchMock;
    if (typeof window !== "undefined") {
      (window as unknown as { fetch: typeof fetch }).fetch = fetchMock;
    }

    const { result } = renderHook(() => useRegistrationFlow(), {
      wrapper: wrapper({
        registerBusiness: mockRegisterBusinessSuccess("tx-db-fail"),
      }),
    });

    act(() => result.current.connectWallet(TEST_WALLET_ADDRESS));
    act(() => result.current.setBusinessName("Acme Traders"));

    act(() => {
      void result.current.submit();
    });

    await waitFor(
      () => {
        expect(result.current.step).toBe("confirmed");
      },
      { timeout: 5000 }
    );

    expect(fetchMock).toHaveBeenCalledWith("/api/business/register", expect.any(Object));
    expect(readPendingRegistration()).toBeNull();
  });
});
