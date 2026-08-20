"use client";

import { getPublicEnv } from "@herledger/config";
import { createAttestation } from "@herledger/sdk";
import { Account } from "@stellar/stellar-sdk";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { FinancialEventDto } from "@/app/api/activity/recent/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorMessage } from "@/components/ui/error-message";
import { FormField } from "@/components/ui/form-field";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { SubmitButton } from "@/components/ui/submit-button";
import { WalletConnect } from "@/components/wallet/wallet-connect";
import { getContractConfig, getStellarConfig } from "@/lib/stellar/network";

// ---------------------------------------------------------------------------
// Attestation creation flow, visible only to wallets registered as active
// attesters (see /api/attestations/attester-status — a server-side check,
// not just a client-side hint, since the on-chain contract enforces the
// same InvalidAttester/InactiveAttester rule regardless). Flow:
//   1. Connect wallet (the attester's own — create_attestation requires
//      attester.require_auth(), unlike attester registration).
//   2. Confirm attester status.
//   3. Pick a FinancialEvent to attest to.
//   4. Enter a human-readable claim; it is hashed to claimHash for the
//      on-chain call, and the plaintext is saved off-chain afterwards so
//      AttestationList can show something more meaningful than a hash.
// ---------------------------------------------------------------------------

type Status = "connecting" | "checking-attester" | "not-attester" | "ready" | "submitting" | "done";

// Deterministic, non-cryptographic hashing — same approach used elsewhere
// in this app for on-chain-bound hashes (see hashReason in dispute-form.tsx
// and hashMetadata in business-registration-form.tsx).
function hashClaim(claim: string): string {
  let hash = 0;
  for (let i = 0; i < claim.length; i++) {
    hash = (hash << 5) - hash + claim.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(64, "0");
}

function generateAttestationId(attester: string, eventId: string): string {
  const input = `${attester}:${eventId}:${Date.now()}`;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash << 5) - hash + input.charCodeAt(i);
    hash |= 0;
  }
  const hex = Math.abs(hash).toString(16).padStart(8, "0");
  return hex.repeat(8);
}

export function CreateAttestationForm() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>("connecting");
  const [attesterAddress, setAttesterAddress] = useState<string | null>(null);
  const [events, setEvents] = useState<FinancialEventDto[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [claim, setClaim] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);

  async function handleWalletConnected(publicKey: string) {
    setAttesterAddress(publicKey);
    setStatus("checking-attester");

    try {
      const statusRes = await fetch(
        `/api/attestations/attester-status?walletAddress=${encodeURIComponent(publicKey)}`
      );
      const statusJson = (await statusRes.json()) as {
        data: { isAttester: boolean } | null;
      };
      if (!statusJson.data?.isAttester) {
        setStatus("not-attester");
        return;
      }

      const eventsRes = await fetch(
        `/api/attestations/events?walletAddress=${encodeURIComponent(publicKey)}&limit=50`
      );
      const eventsJson = (await eventsRes.json()) as {
        data: { events: FinancialEventDto[] } | null;
      };
      setEvents(eventsJson.data?.events ?? []);
      setStatus("ready");
    } catch {
      setError("Could not verify attester status. Please try again.");
      setStatus("not-attester");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!attesterAddress || !selectedEventId) return;

    setError(null);
    setSaveWarning(null);
    setStatus("submitting");

    try {
      const attestationId = generateAttestationId(attesterAddress, selectedEventId);
      const claimHash = hashClaim(claim);
      const stellarConfig = getStellarConfig();
      const contractConfig = getContractConfig();
      const sourceAccount = new Account(attesterAddress, "0");

      const result = await createAttestation(
        {
          attestationId,
          eventId: selectedEventId,
          claimHash,
          attester: attesterAddress,
          sourceAccount,
        },
        stellarConfig,
        contractConfig
      );

      if (!result.success) {
        setError("Attestation transaction did not succeed. Please try again.");
        setStatus("ready");
        return;
      }

      setTxHash(result.hash);
      setStatus("done");

      try {
        const saveRes = await fetch(`/api/attestations/${attestationId}/claim-description`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: selectedEventId,
            attesterAddress,
            claimHash,
            claimDescription: claim,
            ledgerSequence: result.ledger ?? 0,
          }),
        });
        if (!saveRes.ok) {
          setSaveWarning(
            "Your attestation was recorded on-chain, but we could not save the claim description text."
          );
        }
      } catch {
        setSaveWarning(
          "Your attestation was recorded on-chain, but we could not save the claim description text."
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Attestation submission failed.");
      setStatus("ready");
    }
  }

  if (status === "connecting") {
    return (
      <div>
        <h3 style={{ fontSize: "0.9375rem", fontWeight: 500, marginBottom: "0.75rem" }}>
          Connect your attester wallet
        </h3>
        <WalletConnect onConnected={(pk) => void handleWalletConnected(pk)} />
      </div>
    );
  }

  if (status === "checking-attester") return <LoadingSpinner />;

  if (status === "not-attester") {
    return (
      <EmptyState
        title="This wallet is not a registered attester."
        description="Ask a protocol admin to register your wallet from the attester registration page before creating attestations."
      />
    );
  }

  if (status === "done") {
    const network = getPublicEnv().NEXT_PUBLIC_STELLAR_NETWORK;
    return (
      <div>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Attestation created
        </h2>
        {txHash && (
          <p style={{ fontSize: "0.875rem", marginBottom: "1rem" }}>
            <a
              href={`https://stellar.expert/explorer/${network}/tx/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              View attestation transaction on Stellar Expert
            </a>
          </p>
        )}
        {saveWarning && <ErrorMessage message={saveWarning} />}
        <button
          type="button"
          onClick={() => router.push("/dashboard/attestations")}
          style={{
            width: "100%",
            padding: "0.625rem 1rem",
            background: "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius)",
            fontSize: "1rem",
            fontWeight: 500,
            cursor: "pointer",
            marginTop: "0.5rem",
          }}
        >
          Done
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <EmptyState
        title="No financial events available to attest to."
        description="Events will appear here once businesses have recorded on-chain activity."
      />
    );
  }

  return (
    <form onSubmit={(e) => void handleSubmit(e)}>
      {error && <ErrorMessage message={error} />}

      <div style={{ marginBottom: "1rem" }}>
        <label
          htmlFor="eventId"
          style={{ display: "block", fontWeight: 500, fontSize: "0.875rem", marginBottom: "0.375rem" }}
        >
          Financial event
        </label>
        <select
          id="eventId"
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          required
          style={{
            width: "100%",
            padding: "0.5rem 0.75rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: "1rem",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        >
          <option value="" disabled>
            Select an event…
          </option>
          {events.map((event) => (
            <option key={event.eventId} value={event.eventId}>
              {event.eventType} — {event.eventId.slice(0, 12)}… ({event.status})
            </option>
          ))}
        </select>
      </div>

      <FormField
        id="claim"
        label="Claim"
        type="text"
        value={claim}
        onChange={setClaim}
        required
        description='Human-readable claim (e.g. "Invoice verified against bank statement"). Hashed on-chain; the text itself is saved so others can read what it means.'
      />

      <SubmitButton loading={false} disabled={!selectedEventId}>
        Create attestation
      </SubmitButton>
    </form>
  );
}
