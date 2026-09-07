"use client";

/**
 * Wallet context for HerLedger.
 *
 * Architecture notes
 * ------------------
 * • A single React context caches connected address + connection state so
 *   every component in the tree can read wallet state without issuing
 *   duplicate Freighter API calls per render.
 * • The active WalletProvider instance is also stored in context, enabling
 *   swap-in of a different adapter (Albedo, xBull…) without touching
 *   consumer call sites.
 * • Account-change detection: we poll `provider.getAddress()` every 2 s.
 *   Freighter does not expose a stable event API for account switches; a
 *   2-second poll satisfies the acceptance criterion (≤ 2 s detection).
 * • Stale-closure safety: the interval callback reads address via a ref so
 *   it always sees the latest state, never a closure copy.
 */

import { FreighterWalletProvider, WalletError } from "@herledger/sdk";
import type { WalletProvider } from "@herledger/sdk";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface WalletState {
  /** Currently connected Stellar address, or null when not connected. */
  address: string | null;
  /** True when a connection has been established. */
  isConnected: boolean;
  /** True while a connect() call is in progress. */
  isConnecting: boolean;
  /** Last connection error, if any. */
  error: string | null;
  /** The active WalletProvider instance. */
  provider: WalletProvider;
  /** Request a wallet connection. */
  connect: () => Promise<void>;
  /** Disconnect the current wallet. */
  disconnect: () => Promise<void>;
  /** Sign a transaction XDR string using the active provider. */
  signTransaction: (xdr: string, networkPassphrase: string, account?: string) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const WalletContext = createContext<WalletState | null>(null);

// ---------------------------------------------------------------------------
// Account-change polling interval (ms)
// Freighter does not broadcast account-switch events; polling is the only
// reliable cross-browser approach.
// ---------------------------------------------------------------------------
const ACCOUNT_POLL_INTERVAL_MS = 2_000;

// ---------------------------------------------------------------------------
// Provider component
// ---------------------------------------------------------------------------

interface WalletContextProviderProps {
  children: ReactNode;
  /**
   * Override the wallet adapter.  Defaults to `FreighterWalletProvider`.
   * Pass a mock in tests or a different adapter in production.
   */
  provider?: WalletProvider;
}

export function WalletContextProvider({
  children,
  provider: providerProp,
}: WalletContextProviderProps) {
  // Memoize the provider instance so it is stable across re-renders unless
  // the prop identity actually changes. Callbacks and effects read the stable
  // instance directly without a ref, keeping the rendering model simple.
  const provider = useMemo<WalletProvider>(
    () => providerProp ?? new FreighterWalletProvider(),
    // Only re-create when the prop identity changes (e.g. tests injecting a
    // different mock). In production this will always be the same instance.
    [providerProp]
  );

  const [address, setAddress] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Ref mirrors `address` so the polling callback avoids stale closures.
  const addressRef = useRef<string | null>(null);
  useEffect(() => {
    addressRef.current = address;
  }, [address]);

  // ---------------------------------------------------------------------------
  // On mount (or when provider changes): check whether the wallet already has
  // a connected address so the UI reflects a pre-existing session on page load.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    let cancelled = false;
    void provider.getAddress().then((addr: string | null) => {
      if (!cancelled) {
        setAddress(addr);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [provider]); // re-run when the provider instance changes

  // ---------------------------------------------------------------------------
  // Account-change polling
  // When the user switches accounts in Freighter we must update the cached
  // address.  We poll `provider.getAddress()` every 2 s.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const id = setInterval(() => {
      void provider.getAddress().then((newAddr: string | null) => {
        if (newAddr !== addressRef.current) {
          setAddress(newAddr);
          // If the address disappeared the wallet was effectively disconnected.
          if (!newAddr) {
            setError(null);
          }
        }
      });
    }, ACCOUNT_POLL_INTERVAL_MS);

    return () => clearInterval(id);
  }, [provider]); // re-start interval when provider changes

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  const connect = useCallback(async () => {
    setError(null);
    setIsConnecting(true);
    try {
      const { publicKey } = await provider.connect();
      setAddress(publicKey);
    } catch (err) {
      const message =
        err instanceof WalletError ? err.message : "Failed to connect wallet. Please try again.";
      setError(message);
      throw err; // re-throw so callers can react (e.g. show UI feedback)
    } finally {
      setIsConnecting(false);
    }
  }, [provider]);

  const disconnect = useCallback(async () => {
    await provider.disconnect();
    setAddress(null);
    setError(null);
  }, [provider]);

  const signTransaction = useCallback(
    async (xdr: string, networkPassphrase: string, account?: string) => {
      return provider.signTransaction(xdr, networkPassphrase, account);
    },
    [provider]
  );

  const value: WalletState = {
    address,
    isConnected: address !== null,
    isConnecting,
    error,
    provider,
    connect,
    disconnect,
    signTransaction,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

// ---------------------------------------------------------------------------
// useWalletContext — internal hook used by useWallet
// ---------------------------------------------------------------------------

/**
 * Returns the raw WalletState from context.
 * Throws if called outside a `WalletContextProvider`.
 *
 * Prefer using `useWallet()` from `hooks/use-wallet.ts` in components.
 */
export function useWalletContext(): WalletState {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error(
      "useWalletContext must be called inside a <WalletContextProvider>. " +
        "Wrap your app root with <WalletContextProvider> in app/layout.tsx."
    );
  }
  return ctx;
}
