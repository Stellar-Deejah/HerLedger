"use client";

import { useWallet } from "@/hooks/use-wallet";
import { useEffect, useRef, useState } from "react";

import { ErrorMessage } from "@/components/ui/error-message";

interface WalletConnectProps {
  onConnected: (publicKey: string) => void;
}

export function WalletConnect({ onConnected }: WalletConnectProps) {
  const { isConnected, address, loading, error, connect, disconnect } = useWallet();
  const [checking, setChecking] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");

  const onConnectedRef = useRef(onConnected);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  });

  useEffect(() => {
    if (address) {
      onConnectedRef.current(address);
      setStatusMessage("Wallet connected.");
    } else if (!checking) {
      setStatusMessage("Wallet disconnected.");
    }
  }, [address, checking]);

  useEffect(() => {
    if (isConnected && address) {
      setChecking(false);
      setStatusMessage("Wallet already connected.");
    } else if (!loading && !error) {
      setChecking(false);
    }
  }, [isConnected, address, loading, error]);

  async function handleConnect() {
    setStatusMessage("Connecting to wallet...");
    await connect();
  }

  function handleDisconnect() {
    setStatusMessage("Wallet disconnected.");
    disconnect();
  }

  return (
    <div>
      <div role="status" aria-live="polite" className="sr-only">
        {statusMessage}
      </div>

      {checking ? null : isConnected && address ? (
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
            {loading ? "Connecting..." : "Connect wallet"}
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
