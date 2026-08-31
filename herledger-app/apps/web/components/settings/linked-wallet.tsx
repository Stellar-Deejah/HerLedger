"use client";

import { connectWallet, signWalletLinkChallenge, WalletError } from "@herledger/sdk";
import { useEffect, useState } from "react";

import { ErrorMessage } from "@/components/ui/error-message";

// ---------------------------------------------------------------------------
// Linked Wallet settings section.
//
// Re-linking flow: connect Freighter -> request a challenge from the server
// (POST /api/settings/wallet/challenge) -> sign it with Freighter
// (proves control of the new wallet, no transaction/fee) -> submit the
// signature (PATCH /api/settings/wallet), which the server re-verifies
// before updating the linked wallet. Both unlink and re-link are refused by
// the server (409) while the business has an active dispute.
// ---------------------------------------------------------------------------

type WalletState =
  | { status: "loading" }
  | { status: "no-business" }
  | { status: "idle"; walletAddress: string | null; hasActiveDispute: boolean }
  | { status: "connecting"; walletAddress: string | null; hasActiveDispute: boolean }
  | { status: "verifying"; walletAddress: string | null; hasActiveDispute: boolean };

async function fetchJson<T>(
  input: string,
  init?: RequestInit
): Promise<{ data: T | null; error: { code: string; message: string } | null }> {
  const res = await fetch(input, init);
  return res.json();
}

export function LinkedWallet() {
  const [state, setState] = useState<WalletState>({ status: "loading" });
  const [error, setError] = useState<string | null>(null);

  async function load() {
    const { data, error: err } = await fetchJson<{
      walletAddress: string | null;
      hasActiveDispute: boolean;
    }>("/api/settings/wallet");

    if (err?.code === "BUSINESS_NOT_FOUND") {
      setState({ status: "no-business" });
      return;
    }
    if (!data) {
      setState({ status: "no-business" });
      return;
    }
    setState({
      status: "idle",
      walletAddress: data.walletAddress,
      hasActiveDispute: data.hasActiveDispute,
    });
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().catch(() => {});
  }, []);

  async function handleUnlink() {
    if (state.status !== "idle") return;
    setError(null);
    const { error: err } = await fetchJson("/api/settings/wallet", { method: "DELETE" });
    if (err) {
      setError(err.message);
      return;
    }
    setState({ status: "idle", walletAddress: null, hasActiveDispute: state.hasActiveDispute });
  }

  async function handleRelink() {
    if (state.status !== "idle") return;
    setError(null);
    setState({
      status: "connecting",
      walletAddress: state.walletAddress,
      hasActiveDispute: state.hasActiveDispute,
    });

    try {
      const { publicKey } = await connectWallet();

      const { data: challenge, error: challengeErr } = await fetchJson<{
        message: string;
        nonce: string;
        issuedAt: string;
      }>("/api/settings/wallet/challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ walletAddress: publicKey }),
      });
      if (challengeErr || !challenge) {
        throw new Error(challengeErr?.message ?? "Failed to request a verification challenge");
      }

      setState({
        status: "verifying",
        walletAddress: state.walletAddress,
        hasActiveDispute: state.hasActiveDispute,
      });
      const signature = await signWalletLinkChallenge(challenge.message, publicKey);

      const { data: linked, error: linkErr } = await fetchJson<{ walletAddress: string }>(
        "/api/settings/wallet",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            walletAddress: publicKey,
            nonce: challenge.nonce,
            issuedAt: challenge.issuedAt,
            signature,
          }),
        }
      );
      if (linkErr || !linked) {
        throw new Error(linkErr?.message ?? "Failed to re-link wallet");
      }

      setState({ status: "idle", walletAddress: linked.walletAddress, hasActiveDispute: false });
    } catch (err) {
      const message =
        err instanceof WalletError || err instanceof Error
          ? err.message
          : "Failed to re-link wallet. Please try again.";
      setError(message);
      setState({
        status: "idle",
        walletAddress: state.walletAddress,
        hasActiveDispute: state.hasActiveDispute,
      });
    }
  }

  if (state.status === "loading") {
    return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  }

  if (state.status === "no-business") {
    return (
      <p style={{ color: "var(--muted)", fontSize: "0.9375rem" }}>
        Register a business to link a wallet. See the Business Profile page.
      </p>
    );
  }

  const busy = state.status !== "idle";

  return (
    <div>
      {error && <ErrorMessage message={error} />}

      {state.walletAddress ? (
        <div style={{ marginBottom: "1rem" }}>
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.375rem" }}>
            Currently linked wallet
          </p>
          <p
            style={{ fontFamily: "monospace", fontSize: "0.875rem", wordBreak: "break-all" }}
            aria-label="Linked Stellar address"
          >
            {state.walletAddress}
          </p>
        </div>
      ) : (
        <p style={{ color: "var(--muted)", fontSize: "0.9375rem", marginBottom: "1rem" }}>
          No wallet is currently linked.
        </p>
      )}

      {state.hasActiveDispute && (
        <p style={{ color: "var(--danger)", fontSize: "0.8125rem", marginBottom: "1rem" }}>
          This business has an active dispute. Unlinking and re-linking are disabled until it is
          resolved.
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        {state.walletAddress && (
          <button
            type="button"
            onClick={() => void handleUnlink()}
            disabled={busy || state.hasActiveDispute}
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "0.5rem 1rem",
              cursor: busy || state.hasActiveDispute ? "not-allowed" : "pointer",
              fontSize: "0.875rem",
              color: "var(--muted)",
            }}
          >
            Unlink wallet
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleRelink()}
          disabled={busy || state.hasActiveDispute}
          style={{
            background: busy || state.hasActiveDispute ? "var(--muted)" : "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius)",
            padding: "0.5rem 1rem",
            cursor: busy || state.hasActiveDispute ? "not-allowed" : "pointer",
            fontSize: "0.875rem",
            fontWeight: 500,
          }}
        >
          {state.status === "connecting"
            ? "Connecting…"
            : state.status === "verifying"
              ? "Verifying signature…"
              : state.walletAddress
                ? "Re-link wallet"
                : "Link wallet"}
        </button>
      </div>
      <p style={{ marginTop: "0.75rem", fontSize: "0.8125rem", color: "var(--muted)" }}>
        Re-linking requires signing a verification message with Freighter to prove you control the
        wallet. This does not submit an on-chain transaction and costs no fees.
      </p>
    </div>
  );
}
