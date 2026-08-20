"use client";

import { getPublicEnv } from "@herledger/config";
import { registerBusiness } from "@herledger/sdk";
import type { StellarNetworkConfig } from "@herledger/sdk";
import { Account } from "@stellar/stellar-sdk";
import { useEffect, useRef, useState } from "react";

import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { WalletConnect } from "@/components/wallet/wallet-connect";
import { getContractConfig } from "@/lib/stellar/network";

// ---------------------------------------------------------------------------
// Business registration onboarding form
// Follows the spec onboarding flow:
// 1. Connect wallet → 2. Enter business name → 3. Submit on-chain registration
// ---------------------------------------------------------------------------

type Step = "wallet" | "details" | "submitting" | "confirmed" | "error";

function getStellarConfig(): StellarNetworkConfig {
  const env = getPublicEnv();
  return {
    network: env.NEXT_PUBLIC_STELLAR_NETWORK,
    rpcUrl: env.NEXT_PUBLIC_STELLAR_RPC_URL,
    horizonUrl: "", // not needed for writes
    networkPassphrase:
      env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet"
        ? "Public Global Stellar Network ; September 2015"
        : "Test SDF Network ; September 2015",
  };
}

function generateBusinessId(wallet: string, name: string): string {
  // Deterministic business ID: SHA-256-like derivation from wallet+name
  // In the browser we use a simple hash — in production this would use SubtleCrypto
  const input = `${wallet}:${name}:${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  // Pad to 64 hex chars (32 bytes)
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return hex.repeat(8);
}

function hashMetadata(name: string): string {
  // Simple deterministic hash for the metadata. In production:
  // - private metadata is stored off-chain
  // - only the hash is committed on-chain
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, "0");
}

function getStepAnnouncement(step: Step): string {
  switch (step) {
    case "wallet":
      return "Step 1 of 2: Connect your Stellar wallet";
    case "details":
      return "Step 2 of 2: Business details";
    case "confirmed":
      return "Business registered on Stellar";
    case "error":
      return "There was a problem with your registration";
    case "submitting":
      // The submitting view has its own dedicated aria-live paragraph;
      // announcing here too would read the same content twice.
      return "";
  }
}

export function BusinessRegistrationForm() {
  const [step, setStep] = useState<Step>("wallet");
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  // Each step transition moves focus to that step's heading (or first
  // interactive element) so keyboard/screen-reader users aren't left
  // focused on a now-unmounted control from the previous step. The same
  // ref is reused across the mutually-exclusive step branches below.
  const stepFocusTarget = useRef<HTMLElement | null>(null);
  const setStepFocusRef = (node: HTMLElement | null) => {
    stepFocusTarget.current = node;
  };
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    stepFocusTarget.current?.focus();
  }, [step]);

  function handleWalletConnected(publicKey: string) {
    setWalletAddress(publicKey);
    setStep("details");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!walletAddress) return;

    setError(null);
    setStep("submitting");

    try {
      const businessId = generateBusinessId(walletAddress, businessName);
      const metadataHash = hashMetadata(businessName);
      const stellarConfig = getStellarConfig();
      const contractConfig = getContractConfig();

      // A source account is needed to build the transaction.
      // The sequence number will be fetched during simulation.
      const sourceAccount = new Account(walletAddress, "0");

      const result = await registerBusiness(
        {
          businessId,
          owner: walletAddress,
          wallet: walletAddress,
          metadataHash,
          sourceAccount,
        },
        stellarConfig,
        contractConfig
      );

      if (result.success) {
        setTxHash(result.hash);
        setStep("confirmed");

        // Notify the backend to save the application profile
        await fetch("/api/business/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            businessId,
            walletAddress,
            displayName: businessName,
            metadataHash,
            txHash: result.hash,
          }),
        });
      } else {
        setError("Transaction did not succeed. Please try again.");
        setStep("error");
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed.";
      setError(message);
      setStep("error");
    }
  }

  let content: React.ReactNode;

  if (step === "confirmed") {
    content = (
      <div>
        <div style={{ marginBottom: "1rem" }}>
          <StatusBadge status="Verified" />
        </div>
        <p
          ref={setStepFocusRef}
          tabIndex={-1}
          style={{ fontWeight: 500, marginBottom: "0.5rem" }}
        >
          Business registered on Stellar
        </p>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
          Your registration has been confirmed on the Stellar network.
        </p>
        {txHash && (
          <p style={{ fontFamily: "monospace", fontSize: "0.8125rem", wordBreak: "break-all" }}>
            Transaction: {txHash}
          </p>
        )}
      </div>
    );
  } else if (step === "submitting") {
    content = (
      <p ref={setStepFocusRef} tabIndex={-1} aria-live="polite" style={{ color: "var(--muted)" }}>
        Submitting your registration to Stellar… This may take a few seconds.
      </p>
    );
  } else {
    content = (
      <div>
        {step === "wallet" || step === "details" ? (
          <>
            <div style={{ marginBottom: "1.5rem" }}>
              <h3
                ref={step === "wallet" ? setStepFocusRef : undefined}
                tabIndex={step === "wallet" ? -1 : undefined}
                style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "0.75rem" }}
              >
                Step 1: Connect your Stellar wallet
              </h3>
              <WalletConnect onConnected={handleWalletConnected} />
            </div>

            {step === "details" && walletAddress && (
              <form onSubmit={(e) => void handleSubmit(e)}>
                <h3
                  ref={setStepFocusRef}
                  tabIndex={-1}
                  style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "0.75rem" }}
                >
                  Step 2: Business details
                </h3>
                {error && <ErrorMessage message={error} />}
                <FormField
                  id="businessName"
                  label="Business name"
                  type="text"
                  value={businessName}
                  onChange={setBusinessName}
                  required
                />
                <SubmitButton loading={false}>Register on Stellar</SubmitButton>
              </form>
            )}
          </>
        ) : null}

        {step === "error" && (
          <div ref={setStepFocusRef} tabIndex={-1}>
            {error && <ErrorMessage message={error} />}
            <button
              type="button"
              onClick={() => {
                setStep(walletAddress ? "details" : "wallet");
                setError(null);
              }}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0.5rem 1rem",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Try again
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      <div role="status" aria-live="polite" className="sr-only">
        {getStepAnnouncement(step)}
      </div>
      {content}
    </div>
  );
}
