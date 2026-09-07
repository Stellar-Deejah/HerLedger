"use client";

import { getConnectedAddress } from "@herledger/sdk";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

// ---------------------------------------------------------------------------
// App-level Stellar wallet state.
//
// The Freighter extension keeps its own connection; this context caches the
// connected address at the app level so it can be cleared atomically with the
// auth session on sign-out. Components that show or submit with the wallet
// read from here instead of calling `getConnectedAddress()` directly.
// ---------------------------------------------------------------------------

interface WalletContextValue {
  connectedAddress: string | null;
  isChecking: boolean;
  connect: (address: string) => void;
  refreshWallet: () => Promise<string | null>;
  clearWalletState: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);
  const [isChecking, setIsChecking] = useState(true);

  const refreshWallet = useCallback(async (): Promise<string | null> => {
    const address = await getConnectedAddress();
    setConnectedAddress(address);
    return address;
  }, []);

  const connect = useCallback((address: string) => {
    setConnectedAddress(address);
  }, []);

  const clearWalletState = useCallback(() => {
    setConnectedAddress(null);
  }, []);

  // Populate the cached address once on mount so pages that need it don't
  // each have to hit Freighter.
  useEffect(() => {
    void (async () => {
      await refreshWallet();
      setIsChecking(false);
    })();
  }, [refreshWallet]);

  return (
    <WalletContext.Provider
      value={{ connectedAddress, isChecking, connect, refreshWallet, clearWalletState }}
    >
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within a WalletProvider");
  }
  return ctx;
}
