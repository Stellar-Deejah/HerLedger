import { WalletError } from "@herledger/sdk";
import type { ReactNode } from "react";

import { SdkContext, defaultSdkClient, type SdkClient } from "@/lib/sdk/sdk-context";

// ---------------------------------------------------------------------------
// MockSdkProvider
//
// Wraps children in the same SdkContext components consume in production,
// overriding only the SDK functions you configure. This is the pattern
// documented in CONTRIBUTING.md — no `vi.mock("@herledger/sdk")`, no manual
// jest/vitest module factory maintenance. Any component test that touches
// on-chain SDK calls should render inside this provider.
//
// Usage:
//
//   render(
//     <MockSdkProvider overrides={{ registerBusiness: mockRegisterBusinessSuccess() }}>
//       <BusinessRegistrationForm />
//     </MockSdkProvider>
//   );
// ---------------------------------------------------------------------------

export interface MockSdkProviderProps {
  children: ReactNode;
  /** Only the SDK functions relevant to the test need to be provided. */
  overrides?: Partial<SdkClient> | undefined;
}

export function MockSdkProvider({ children, overrides }: MockSdkProviderProps) {
  const value: SdkClient = { ...defaultSdkClient, ...overrides };
  return <SdkContext.Provider value={value}>{children}</SdkContext.Provider>;
}

// ---------------------------------------------------------------------------
// Configurable mock response builders for registerBusiness.
// Use these to simulate the success / failure / rejected-transaction paths
// called out in the issue's acceptance criteria.
// ---------------------------------------------------------------------------

/** Resolves as a successful on-chain transaction. */
export function mockRegisterBusinessSuccess(
  txHash: string = `mock-tx-${Math.random().toString(36).slice(2)}`
): SdkClient["registerBusiness"] {
  return async () => ({ hash: txHash, success: true, ledger: 123456 });
}

/**
 * Rejects with an error, simulating a thrown failure (network error,
 * Freighter signing rejection, RPC error, etc.) — exercises the
 * `SUBMIT_FAILED` transition via the catch branch in `submit()`.
 */
export function mockRegisterBusinessThrows(
  message = "Simulated SDK failure"
): SdkClient["registerBusiness"] {
  return async () => {
    throw new Error(message);
  };
}

/**
 * Resolves successfully at the RPC layer but with `success: false`,
 * simulating a transaction that landed but did not succeed on-chain —
 * exercises the `SUBMIT_FAILED` transition via the `result.success` branch.
 */
export function mockRegisterBusinessRejectedOnChain(): SdkClient["registerBusiness"] {
  return async () => ({ hash: "", success: false });
}

/** Never resolves — useful for asserting the "submitting" step renders correctly. */
export function mockRegisterBusinessPending(): SdkClient["registerBusiness"] {
  return () => new Promise(() => {});
}

/**
 * Throws a `WalletError`, simulating Freighter disconnecting (or a signing
 * call failing because it's no longer reachable) mid-flow — exercises the
 * `WALLET_DISCONNECTED` transition, distinct from a generic thrown error.
 */
export function mockRegisterBusinessWalletDisconnected(
  message = "Freighter signing rejected: wallet disconnected"
): SdkClient["registerBusiness"] {
  return async () => {
    throw new WalletError(message);
  };
}

/**
 * Fires `onSubmitted` with the given hash before resolving successfully —
 * exercises the pending-registration write inside submit(), same as a real
 * `registerBusiness()` call reaching on-chain submission.
 */
export function mockRegisterBusinessSuccessWithSubmittedHash(
  txHash: string
): SdkClient["registerBusiness"] {
  return async (_params, _config, _contracts, onSubmitted) => {
    onSubmitted?.(txHash);
    return { hash: txHash, success: true, ledger: 123456 };
  };
}

/** Resolves as a successfully-confirmed poll — used to exercise the resume-on-reload path. */
export function mockPollTransactionStatusSuccess(
  txHash: string = `mock-tx-${Math.random().toString(36).slice(2)}`
): SdkClient["pollTransactionStatus"] {
  return async () => ({ hash: txHash, success: true, ledger: 123456 });
}

/** Rejects, simulating a poll that times out or finds the transaction failed on-chain. */
export function mockPollTransactionStatusThrows(
  message = "Simulated poll failure"
): SdkClient["pollTransactionStatus"] {
  return async () => {
    throw new Error(message);
  };
}
