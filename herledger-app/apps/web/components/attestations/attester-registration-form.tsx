"use client";

import { getPublicEnv } from "@herledger/config";
import { registerAttester } from "@herledger/sdk";
import { Account } from "@stellar/stellar-sdk";
import { useState } from "react";

import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { StatusBadge } from "@/components/ui/status-badge";
import { SubmitButton } from "@/components/ui/submit-button";
import { WalletConnect } from "@/components/wallet/wallet-connect";
import { getContractConfig, getStellarConfig } from "@/lib/stellar/network";

// ---------------------------------------------------------------------------
// Attester onboarding form.
//
// AttestationRegistry.register_attester requires the PROTOCOL ADMIN's
// signature, not the attester's own (see attester.require_auth() vs.
// admin.require_auth() in contracts/attestation_registry/src/lib.rs). So
// unlike BusinessRegistrationForm -- where the connecting wallet registers
// itself -- the wallet connected here must be the registry admin, and the
// form's "Attester wallet address" field is a THIRD PARTY address the
// admin is onboarding (an auditing firm, a partner institution, etc). If a
// non-admin wallet is connected, the on-chain call simply fails and
// surfaces as a transaction error below; there is no separate client-side
// admin check because the contract is the only source of truth for who the
// admin is.
// ---------------------------------------------------------------------------

type Step = "wallet" | "details" | "submitting" | "confirmed" | "error";

// Deterministic, non-cryptographic metadata hash — same approach as
// business-registration-form.tsx's hashMetadata(). The plaintext
// (displayName + description) is what gets persisted off-chain via
// POST /api/attestations/register-attester; only this hash goes on-chain.
function hashMetadata(displayName: string, description: string): string {
  const input = `${displayName}:${description}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, "0");
}

export function AttesterRegistrationForm() {
  const [step, setStep] = useState<Step>("wallet");
  const [adminAddress, setAdminAddress] = useState<string | null>(null);
  const [attesterAddress, setAttesterAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  function handleWalletConnected(publicKey: string) {
    setAdminAddress(publicKey);
    setStep("details");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!adminAddress) return;

    setError(null);
    setSaveWarning(null);
    setStep("submitting");

    try {
      const metadataHash = hashMetadata(displayName, description);
      const stellarConfig = getStellarConfig();
      const contractConfig = getContractConfig();
      const sourceAccount = new Account(adminAddress, "0");

      const result = await registerAttester(
        {
          attester: attesterAddress,
          metadataHash,
          admin: adminAddress,
          sourceAccount,
        },
        stellarConfig,
        contractConfig
      );

      if (!result.success) {
        setError("Transaction did not succeed. Please try again.");
        setStep("error");
        return;
      }

      setTxHash(result.hash);
      setStep("confirmed");

      try {
        const saveRes = await fetch("/api/attestations/register-attester", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: attesterAddress,
            displayName,
            description: description || undefined,
            metadataHash,
            txHash: result.hash,
          }),
        });
        if (!saveRes.ok) {
          setSaveWarning(
            "The attester was registered on-chain, but we could not save their profile details."
          );
        }
      } catch {
        setSaveWarning(
          "The attester was registered on-chain, but we could not save their profile details."
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Registration failed.";
      setError(message);
      setStep("error");
    }
  }

  if (step === "confirmed") {
    const network = getPublicEnv().NEXT_PUBLIC_STELLAR_NETWORK;
    return (
      <div>
        <div style={{ marginBottom: "1rem" }}>
          <StatusBadge status="Active" />
        </div>
        <p style={{ fontWeight: 500, marginBottom: "0.5rem" }}>Attester registered on Stellar</p>
        <p style={{ color: "var(--muted)", fontSize: "0.875rem", marginBottom: "0.5rem" }}>
          {displayName} can now create attestations for HerLedger financial events.
        </p>
        {txHash && (
          <p style={{ fontSize: "0.875rem", marginBottom: "0.5rem" }}>
            <a
              href={`https://stellar.expert/explorer/${network}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View registration transaction on Stellar Expert
            </a>
          </p>
        )}
        {saveWarning && <ErrorMessage message={saveWarning} />}
      </div>
    );
  }

  if (step === "submitting") {
    return (
      <p aria-live="polite" style={{ color: "var(--muted)" }}>
        Submitting attester registration to Stellar… This may take a few seconds.
      </p>
    );
  }

  return (
    <div>
      <div style={{ marginBottom: "1.5rem" }}>
        <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "0.75rem" }}>
          Step 1: Connect the protocol admin wallet
        </h3>
        <p style={{ color: "var(--muted)", fontSize: "0.8125rem", marginBottom: "0.75rem" }}>
          Registering an attester requires the AttestationRegistry admin wallet — the wallet you
          connect here must be the contract admin, not the attester being registered.
        </p>
        <WalletConnect onConnected={handleWalletConnected} />
      </div>

      {step === "details" && adminAddress && (
        <form onSubmit={(e) => void handleSubmit(e)}>
          <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "0.75rem" }}>
            Step 2: Attester details
          </h3>
          {error && <ErrorMessage message={error} />}
          <FormField
            id="attesterAddress"
            label="Attester Stellar address"
            type="text"
            value={attesterAddress}
            onChange={setAttesterAddress}
            required
            description="The G... wallet address of the attesting party (e.g. an auditing firm)."
          />
          <FormField
            id="displayName"
            label="Display name"
            type="text"
            value={displayName}
            onChange={setDisplayName}
            required
          />
          <FormField
            id="description"
            label="Description (optional)"
            type="text"
            value={description}
            onChange={setDescription}
            description='e.g. "Independent auditing firm" or "Payment processing partner".'
          />
          <SubmitButton loading={false}>Register attester on Stellar</SubmitButton>
        </form>
      )}

      {step === "error" && (
        <div>
          {error && <ErrorMessage message={error} />}
          <button
            type="button"
            onClick={() => {
              setStep(adminAddress ? "details" : "wallet");
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
