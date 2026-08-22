"use client";

import { connectWallet, getConnectedAddress } from "@herledger/sdk/wallet";
import { WalletError } from "@herledger/sdk/errors";
import { useState, useEffect, useRef } from "react";

import { ErrorMessage } from "@/components/ui/error-message";
import { truncateAddress } from "@/lib/utils/format";

interface WalletConnectProps {
  onConnected: (publicKey: string) => void;
}

export function WalletConnect({ onConnected }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  // Text for the persistent live region below — announces async wallet state
  // changes to screen readers even though the visual UI is swapped, not just
  // updated in place.
  const [statusMessage, setStatusMessage] = useState("");

  // Effect must run only once on mount; capture the latest `onConnected` via
  // a ref instead of a dependency so it can't fire from a stale closure.
  const onConnectedRef = useRef(onConnected);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  });

  useEffect(() => {
    void (async () => {
      const existing = await getConnectedAddress();
      if (existing) {
        setAddress(existing);
        setStatusMessage("Wallet already connected.");
        onConnectedRef.current(existing);
      }
      setChecking(false);
    })();
  }, []);

  async function handleConnect() {
    setError(null);
    setLoading(true);
    setStatusMessage("Connecting to Freighter wallet…");
    try {
      const { publicKey } = await connectWallet();
      setAddress(publicKey);
      setStatusMessage("Wallet connected.");
      onConnected(publicKey);
    } catch (err) {
      const message =
        err instanceof WalletError ? err.message : "Failed to connect wallet. Please try again.";
      setError(message);
      setStatusMessage(`Wallet connection failed: ${message}`);
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    setAddress(null);
    setError(null);
    setStatusMessage("Wallet disconnected.");
  }

  return (
    <div>
      {/* Kept mounted across every state (including the initial `checking`
          phase) so screen readers reliably pick up each announcement —
          a live region that gets unmounted/remounted is not guaranteed to
          be observed by assistive tech. */}
      <div role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {checking ? null : address ? (
        <div
          style={{
            padding: "1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <p style={{ fontSize: "0.875rem", color: "var(--muted)", marginBottom: "0.5rem" }}>
            Connected wallet
          </p>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "0.875rem",
              wordBreak: "break-all",
              marginBottom: "0.75rem",
            }}
            aria-label={`Connected Stellar address ${address}`}
            title={address}
          >
            {truncateAddress(address)}
          </p>
          <button
            onClick={handleDisconnect}
            type="button"
            style={{
              background: "none",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              padding: "0.375rem 0.75rem",
              cursor: "pointer",
              fontSize: "0.875rem",
              color: "var(--muted)",
            }}
          >
            Disconnect
          </button>
        </div>
      ) : (
        <div>
          {error && <ErrorMessage message={error} />}
          <button
            onClick={() => void handleConnect()}
            disabled={loading}
            type="button"
            style={{
              padding: "0.625rem 1.25rem",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius)",
              fontSize: "0.9375rem",
              fontWeight: 500,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Connecting…" : "Connect Freighter wallet"}
          </button>
          <p
            style={{
              marginTop: "0.75rem",
              fontSize: "0.8125rem",
              color: "var(--muted)",
            }}
          >
            You need the{" "}
            <a href="https://freighter.app" target="_blank" rel="noopener noreferrer">
              Freighter browser extension
            </a>{" "}
            to connect a Stellar wallet.
          </p>
        </div>
      )}
    </div>
  );
}
