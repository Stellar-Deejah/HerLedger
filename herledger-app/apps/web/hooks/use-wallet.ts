"use client";

/**
 * useWallet — the single access point for wallet state in HerLedger components.
 *
 * Usage
 * -----
 * ```tsx
 * function MyComponent() {
 *   const { address, isConnected, isConnecting, connect, disconnect, signTransaction } = useWallet();
 *   …
 * }
 * ```
 *
 * The hook must be called inside a component tree wrapped by
 * `<WalletContextProvider>` (mounted in `app/layout.tsx`).
 */

import { useWalletContext } from "@/lib/wallet/context";
import type { WalletState } from "@/lib/wallet/context";

export type { WalletState };

/**
 * Returns all wallet state and actions from `WalletContext`.
 *
 * Returned values:
 * - `address`         — connected Stellar public key, or `null`
 * - `isConnected`     — `true` when `address` is non-null
 * - `isConnecting`    — `true` while `connect()` is awaiting a response
 * - `error`           — last connection error message, or `null`
 * - `provider`        — the active `WalletProvider` instance
 * - `connect()`       — requests wallet access; updates `address` on success
 * - `disconnect()`    — clears wallet state
 * - `signTransaction(xdr, passphrase, account?)` — signs a Stellar tx XDR
 */
export function useWallet(): WalletState {
  return useWalletContext();
}
