"use client";

import { useEffect, useRef } from "react";

import { ErrorMessage } from "@/components/ui/error-message";
import { useWallet } from "@/hooks/use-wallet";

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
  const { address, isConnected, isConnecting, error, connect, disconnect } = useWallet();

  // Capture the latest onConnected in a ref to avoid stale closures in the
  // effect below without making address the only trigger.
  const onConnectedRef = useRef(onConnected);
  useEffect(() => {
    onConnectedRef.current = onConnected;
  });

  // Forward the connected address to the parent whenever it changes.
  // Using a ref-tracked "last notified address" prevents double-firing when
  // the same address is seen across re-renders.
  const lastNotifiedRef = useRef<string | null>(null);
  useEffect(() => {
    if (address && address !== lastNotifiedRef.current) {
      lastNotifiedRef.current = address;
      onConnectedRef.current(address);
    }
    if (!address) {
      lastNotifiedRef.current = null;
    }
  }, [address]);

  async function handleConnect() {
    try {
      await connect();
    } catch {
      // Error is already captured in context.error — nothing extra to do.
    }
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

      {isConnected && address ? (
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
