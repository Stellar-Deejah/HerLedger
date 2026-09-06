"use client";

import { useState, useEffect } from "react";
import {
  isFreighterAvailable,
  connectWallet,
  getConnectedAddress,
  WalletError,
} from "@herledger/sdk";
import { ErrorMessage } from "@/components/ui/error-message";

interface WalletConnectProps {
  onConnected: (publicKey: string) => void;
}

export function WalletConnect({ onConnected }: WalletConnectProps) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    void (async () => {
      const existing = await getConnectedAddress();
      if (existing) {
        setAddress(existing);
        onConnected(existing);
      }
      setChecking(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  async function handleConnect() {
    setError(null);
    setLoading(true);
    try {
      const { publicKey } = await connectWallet();
      setAddress(publicKey);
      onConnected(publicKey);
    } catch (err) {
      if (err instanceof WalletError) {
        setError(err.message);
      } else {
        setError("Failed to connect wallet. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  function handleDisconnect() {
    setAddress(null);
    setError(null);
  }

  if (checking) return null;

  if (address) {
    return (
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
          aria-label="Connected Stellar address"
        >
          {address}
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
    );
  }

  return (
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
  );
}
