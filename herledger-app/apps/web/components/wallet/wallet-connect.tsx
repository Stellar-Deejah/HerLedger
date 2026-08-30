"use client";

import { connectWallet, WalletError } from "@herledger/sdk";
import { useEffect, useRef, useState } from "react";

import { ErrorMessage } from "@/components/ui/error-message";
import { useWallet } from "@/components/wallet/wallet-provider";
import { truncateAddress } from "@/lib/utils/format";

interface WalletConnectProps {
  onConnected: (publicKey: string) => void;
}

/**
 * Wallet connection widget.
 *
 * All wallet state (address, isConnecting, error) now comes from the shared
 * `WalletContext` via `useWallet()`.  This means:
 * - No duplicate Freighter API calls per render.
 * - Account changes detected by the context polling propagate here
 *   automatically without any local timer.
 * - The `onConnected` callback is still forwarded so parent forms can advance
 *   their own step state when the wallet becomes connected.
 */
export function WalletConnect({ onConnected }: WalletConnectProps) {
  const { connectedAddress, isChecking, connect, clearWalletState } = useWallet();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Text for the persistent live region below — announces async wallet state
  // changes to screen readers even though the visual UI is swapped, not just
  // updated in place.
  const [statusMessage, setStatusMessage] = useState("");

  // Capture the latest `onConnected` via a ref so the effect below can't fire
  // from a stale closure when the parent re-renders.
  const onConnectedRef = useRef(onConnected);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  });

  // Notify the parent when the context reports a connected address (on mount
  // or after the user connects).
  useEffect(() => {
    if (connectedAddress) {
      onConnectedRef.current(connectedAddress);
    }
  }, [connectedAddress]);

  const isConnecting = loading;
  const isConnected = Boolean(connectedAddress);
  const disconnect = handleDisconnect;

  async function handleConnect() {
    setLoading(true);
    setError(null);
    try {
      const { publicKey } = await connectWallet();
      connect(publicKey);
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
    clearWalletState();
    setError(null);
    setStatusMessage("Wallet disconnected.");
  }

  return (
    <div>
      {/* Persistent live region for screen readers. */}
      <div role="status" aria-live="polite" className="sr-only">
        {isConnecting
          ? "Connecting to Freighter wallet…"
          : isConnected
            ? "Wallet connected."
            : error
              ? `Wallet connection failed: ${error}`
              : ""}
      </div>

      {isChecking ? null : connectedAddress ? (
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
            aria-label={`Connected Stellar address ${connectedAddress}`}
            title={connectedAddress}
          >
            {truncateAddress(connectedAddress)}
          </p>
          <button
            onClick={() => void disconnect()}
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
            disabled={isConnecting}
            type="button"
            style={{
              padding: "0.625rem 1.25rem",
              background: "var(--primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--radius)",
              fontSize: "0.9375rem",
              fontWeight: 500,
              cursor: isConnecting ? "not-allowed" : "pointer",
            }}
          >
            {isConnecting ? "Connecting…" : "Connect Freighter wallet"}
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
