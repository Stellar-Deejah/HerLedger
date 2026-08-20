"use client";

import { WalletError } from "@herledger/sdk";
import { Account } from "@stellar/stellar-sdk";
import { useCallback, useEffect, useReducer, useRef } from "react";

import {
  readPendingRegistration,
  writePendingRegistration,
  clearPendingRegistration,
} from "@/lib/business/pending-registration";
import { useSdk } from "@/lib/sdk/sdk-context";
import { getStellarConfig, getContractConfig } from "@/lib/stellar/network";

export type RegistrationStep = "wallet" | "details" | "submitting" | "confirmed" | "error";

export interface RegistrationFlowState {
  step: RegistrationStep;
  walletAddress: string | null;
  businessName: string;
  error: string | null;
  txHash: string | null;
}

export type RegistrationFlowAction =
  | { type: "WALLET_CONNECTED"; walletAddress: string }
  | { type: "BUSINESS_NAME_CHANGED"; businessName: string }
  | { type: "SUBMIT_STARTED" }
  | { type: "SUBMIT_SUCCEEDED"; txHash: string }
  | { type: "SUBMIT_FAILED"; error: string }
  | { type: "RETRY_REQUESTED" }
  | { type: "RESUME_PENDING"; walletAddress: string; txHash: string }
  | { type: "WALLET_DISCONNECTED" };

export const initialRegistrationFlowState: RegistrationFlowState = {
  step: "wallet",
  walletAddress: null,
  businessName: "",
  error: null,
  txHash: null,
};

export function registrationFlowReducer(
  state: RegistrationFlowState,
  action: RegistrationFlowAction
): RegistrationFlowState {
  if (state.step === "confirmed") {
    return state;
  }

  switch (action.type) {
    case "WALLET_CONNECTED":
      if (state.step === "submitting") return state;
      return { ...state, walletAddress: action.walletAddress, step: "details" };

    case "BUSINESS_NAME_CHANGED":
      if (state.step === "submitting") return state;
      return { ...state, businessName: action.businessName };

    case "SUBMIT_STARTED":
      if (state.step !== "details" || !state.walletAddress) return state;
      return { ...state, step: "submitting", error: null };

    case "SUBMIT_SUCCEEDED":
      if (state.step !== "submitting") return state;
      return { ...state, step: "confirmed", txHash: action.txHash, error: null };

    case "SUBMIT_FAILED":
      if (state.step !== "submitting") return state;
      return { ...state, step: "error", error: action.error };

    case "RETRY_REQUESTED":
      if (state.step !== "error") return state;
      return { ...state, step: state.walletAddress ? "details" : "wallet", error: null };

    case "RESUME_PENDING":
      // Only valid as the very first transition after mount, before the
      // user has done anything -- see the resume effect in
      // useRegistrationFlow, which dispatches this at most once.
      if (state.step !== "wallet") return state;
      return {
        ...state,
        walletAddress: action.walletAddress,
        txHash: action.txHash,
        step: "submitting",
        error: null,
      };

    case "WALLET_DISCONNECTED":
      // Reachable while filling out details (a background disconnect) or
      // mid-submit (signing throws once Freighter can't reach the wallet).
      // Clearing walletAddress means RETRY_REQUESTED routes back to
      // "wallet" instead of looping on "details" with a wallet that's no
      // longer there to sign anything.
      if (state.step !== "details" && state.step !== "submitting") return state;
      return {
        ...state,
        walletAddress: null,
        step: "error",
        error: 'Your wallet disconnected. Click "Try again" to reconnect and continue.',
      };

    default:
      return state;
  }
}

function generateBusinessId(wallet: string, name: string): string {
  const input = `${wallet}:${name}:${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return hex.repeat(8);
}

function hashMetadata(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, "0");
}

/**
 * POSTs the confirmed registration to the DB. A 2xx means it was written
 * (fresh or an idempotent replay of the same businessId); a 409 means the
 * API already resolved this one way or another (see
 * app/api/business/register/route.ts) -- either way there's nothing left
 * to retry. Anything else (network error, 5xx) throws, so callers know to
 * leave the pending registration in place for a later resume.
 */
async function postBusinessRegistration(payload: {
  businessId: string;
  walletAddress: string;
  displayName: string;
  metadataHash: string;
  txHash: string;
}): Promise<void> {
  const res = await fetch("/api/business/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Registration API responded with ${res.status}`);
  }
}

export interface UseRegistrationFlowResult extends RegistrationFlowState {
  connectWallet: (walletAddress: string) => void;
  setBusinessName: (businessName: string) => void;
  submit: () => Promise<void>;
  retry: () => void;
}

export function useRegistrationFlow(): UseRegistrationFlowResult {
  const [state, dispatch] = useReducer(registrationFlowReducer, initialRegistrationFlowState);
  const sdk = useSdk();
  // MockSdkProvider (tests) rebuilds its context value on every render, so
  // `sdk` isn't a stable dependency -- captured in a ref (same pattern as
  // WalletConnect's onConnectedRef) so the mount-only resume effect below
  // can read the latest client without re-running on every render.
  const sdkRef = useRef(sdk);
  useEffect(() => {
    sdkRef.current = sdk;
  });

  const connectWallet = useCallback((walletAddress: string) => {
    dispatch({ type: "WALLET_CONNECTED", walletAddress });
  }, []);

  const setBusinessName = useCallback((businessName: string) => {
    dispatch({ type: "BUSINESS_NAME_CHANGED", businessName });
  }, []);

  const retry = useCallback(() => {
    dispatch({ type: "RETRY_REQUESTED" });
  }, []);

  // Resume a registration left in flight by a previous session -- e.g. the
  // tab was closed while submitAndWait was still waiting on-chain, so
  // nothing ever reached the SUBMIT_SUCCEEDED dispatch or the DB POST
  // below. Runs once on mount, before the user does anything, so it only
  // ever races the (also mount-time) WalletConnect auto-reconnect check,
  // never a user-initiated submit().
  useEffect(() => {
    const pending = readPendingRegistration();
    if (!pending) return;

    dispatch({
      type: "RESUME_PENDING",
      walletAddress: pending.walletAddress,
      txHash: pending.txHash,
    });

    void (async () => {
      try {
        const stellarConfig = getStellarConfig();
        const result = await sdkRef.current.pollTransactionStatus(pending.txHash, stellarConfig);

        if (result.success) {
          dispatch({ type: "SUBMIT_SUCCEEDED", txHash: pending.txHash });
          await postBusinessRegistration({
            businessId: pending.businessId,
            walletAddress: pending.walletAddress,
            displayName: pending.displayName,
            metadataHash: pending.metadataHash,
            txHash: pending.txHash,
          });
          clearPendingRegistration();
        } else {
          clearPendingRegistration();
          dispatch({
            type: "SUBMIT_FAILED",
            error: "Transaction did not succeed. Please try again.",
          });
        }
      } catch (err) {
        // Covers both a genuine on-chain failure and a poll timeout. In
        // the timeout case the tx might still land later, but re-polling
        // silently on every reload risks looping forever on a truly dead
        // hash -- the user's own retry (a fresh submit, new businessId)
        // is the more predictable recovery path.
        clearPendingRegistration();
        const message = err instanceof Error ? err.message : "Failed to resume registration.";
        dispatch({ type: "SUBMIT_FAILED", error: message });
      }
    })();
  }, []);

  const submit = useCallback(async () => {
    if (state.step !== "details" || !state.walletAddress) return;

    dispatch({ type: "SUBMIT_STARTED" });

    const walletAddress = state.walletAddress;
    const displayName = state.businessName;
    const businessId = generateBusinessId(walletAddress, displayName);
    const metadataHash = hashMetadata(displayName);

    try {
      const stellarConfig = getStellarConfig();
      const contractConfig = getContractConfig();
      const sourceAccount = new Account(walletAddress, "0");

      const result = await sdk.registerBusiness(
        {
          businessId,
          owner: walletAddress,
          wallet: walletAddress,
          metadataHash,
          sourceAccount,
        },
        stellarConfig,
        contractConfig,
        (hash) => {
          // Persisted the instant the network accepts the submission --
          // the earliest point a tab-close would otherwise lose track of
          // an in-flight registration. See lib/business/pending-registration.ts.
          writePendingRegistration({
            businessId,
            walletAddress,
            displayName,
            metadataHash,
            txHash: hash,
            submittedAt: new Date().toISOString(),
          });
        }
      );

      if (result.success) {
        dispatch({ type: "SUBMIT_SUCCEEDED", txHash: result.hash });
        await postBusinessRegistration({
          businessId,
          walletAddress,
          displayName,
          metadataHash,
          txHash: result.hash,
        });
        clearPendingRegistration();
      } else {
        clearPendingRegistration();
        dispatch({
          type: "SUBMIT_FAILED",
          error: "Transaction did not succeed. Please try again.",
        });
      }
    } catch (err) {
      if (err instanceof WalletError) {
        dispatch({ type: "WALLET_DISCONNECTED" });
        return;
      }
      const message = err instanceof Error ? err.message : "Registration failed.";
      dispatch({ type: "SUBMIT_FAILED", error: message });
    }
  }, [sdk, state.step, state.walletAddress, state.businessName]);

  return { ...state, connectWallet, setBusinessName, submit, retry };
}
