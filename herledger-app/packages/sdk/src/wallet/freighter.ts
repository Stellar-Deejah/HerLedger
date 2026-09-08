import {
  isConnected,
  getAddress,
  signTransaction,
  requestAccess,
  getNetwork,
} from "@stellar/freighter-api";
import { WalletError, WalletErrorCode } from "../errors/index.js";
import type { WalletConnection, WalletProvider } from "./types.js";

import type { WalletConnection, WalletProvider } from "./types.js";

// ---------------------------------------------------------------------------
// FreighterWalletProvider
// Implements WalletProvider by delegating to the Freighter browser extension.
// ---------------------------------------------------------------------------

export class FreighterWalletProvider implements WalletProvider {
  /**
   * Check whether the Freighter extension is installed and accessible.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const result = await isConnected();
      return result.isConnected;
    } catch {
      return false;
    }
  }

  /**
   * Request access to the user's Freighter wallet and return its connected
   * public key and network.
   *
   * @returns A `WalletConnection` with `publicKey` and `network`.
   * @throws {WalletError} if Freighter is unavailable, access is denied, or the
   *   address/network cannot be retrieved.
   *
   * @example
   * ```ts
   * const { publicKey } = await connectWallet();
   * ```
   */
  async connect(): Promise<WalletConnection> {
    const available = await this.isAvailable();
    if (!available) {
      throw new WalletError(
        WalletErrorCode.NOT_INSTALLED,
        "Freighter wallet extension is not installed or not available. Please install Freighter to continue."
      );
    }

    let accessResult: Awaited<ReturnType<typeof requestAccess>>;
    try {
      accessResult = await requestAccess();
    } catch (cause) {
      throw new WalletError(WalletErrorCode.ACCESS_DENIED, "Failed to request Freighter access", {
        cause,
      });
    }

    if (accessResult.error) {
      throw new WalletError(
        WalletErrorCode.ACCESS_DENIED,
        `Freighter access denied: ${accessResult.error}`,
        { context: { reason: accessResult.error } }
      );
    }

    let addressResult: Awaited<ReturnType<typeof getAddress>>;
    try {
      addressResult = await getAddress();
    } catch (cause) {
      throw new WalletError(
        WalletErrorCode.ADDRESS_UNAVAILABLE,
        "Failed to retrieve wallet address from Freighter",
        { cause }
      );
    }

    if (addressResult.error || !addressResult.address) {
      throw new WalletError(
        WalletErrorCode.ADDRESS_UNAVAILABLE,
        `Could not retrieve wallet address: ${addressResult.error ?? "unknown error"}`,
        { context: { reason: addressResult.error } }
      );
    }

    let networkResult: Awaited<ReturnType<typeof getNetwork>>;
    try {
      networkResult = await getNetwork();
    } catch (cause) {
      throw new WalletError(
        WalletErrorCode.UNAVAILABLE,
        "Failed to retrieve network from Freighter",
        { cause }
      );
    }

    return {
      publicKey: addressResult.address,
      network: networkResult.network ?? "UNKNOWN",
    };
  }

  /**
   * Freighter has no disconnect API; there is no local session state to clear.
   */
  async disconnect(): Promise<void> {
    return;
  }

  /**
   * Get the currently connected public key without prompting for access.
   *
   * @returns The connected `G...` address, or `null` if no wallet is connected
   *   or Freighter is unavailable.
   */
  async getAddress(): Promise<string | null> {
    try {
      const result = await getAddress();
      if (result.error || !result.address) {
        return null;
      }
      return result.address;
    } catch {
      return null;
    }
  }

  /**
   * Sign a transaction XDR string using Freighter and return the signed XDR.
   *
   * @param transactionXdr - Base64-encoded unsigned (or partially signed)
   *   transaction envelope.
   * @param networkPassphrase - The Stellar network passphrase to sign for.
   * @param accountToSign - Optional specific account to sign with; defaults to
   *   the Freighter-connected account when omitted.
   * @returns The base64-encoded signed transaction XDR.
   * @throws {WalletError} if the user rejects, Freighter is unavailable, or no
   *   signed XDR is returned.
   */
  async signTransaction(
    transactionXdr: string,
    networkPassphrase: string,
    accountToSign?: string
  ): Promise<string> {
    let result: Awaited<ReturnType<typeof signTransaction>>;
    try {
      result = await signTransaction(transactionXdr, {
        networkPassphrase,
        ...(accountToSign !== undefined && { address: accountToSign }),
      });
    } catch (cause) {
      throw new WalletError(
        WalletErrorCode.SIGNING_REJECTED,
        "Failed to sign transaction with Freighter",
        { cause }
      );
    }

    if (result.error) {
      throw new WalletError(
        WalletErrorCode.SIGNING_REJECTED,
        `Freighter signing rejected: ${result.error}`,
        { context: { reason: result.error } }
      );
    }

    if (!result.signedTxXdr) {
      throw new WalletError(
        WalletErrorCode.UNAVAILABLE,
        "Freighter returned no signed transaction XDR"
      );
    }

    return result.signedTxXdr;
  }
}

// ---------------------------------------------------------------------------
// Singleton instance — convenient for components that don't need to
// construct a provider themselves.
// ---------------------------------------------------------------------------

/** Default shared FreighterWalletProvider instance. */
export const freighterWalletProvider = new FreighterWalletProvider();

// ---------------------------------------------------------------------------
// Backward-compatible functional API
// These exports preserve the pre-abstraction surface so existing call sites
// (wallet-connect.tsx, dispute-form.tsx, …) keep compiling while they are
// progressively migrated to useWallet().
// ---------------------------------------------------------------------------

/**
 * @deprecated Use `FreighterWalletProvider.isAvailable()` or the `useWallet()` hook instead.
 */
export async function isFreighterAvailable(): Promise<boolean> {
  return freighterWalletProvider.isAvailable();
}

/**
 * @deprecated Use `FreighterWalletProvider.connect()` or the `useWallet()` hook instead.
 */
export async function connectWallet(): Promise<WalletConnection> {
  return freighterWalletProvider.connect();
}

/**
 * @deprecated Use `FreighterWalletProvider.getAddress()` or the `useWallet()` hook instead.
 */
export async function getConnectedAddress(): Promise<string | null> {
  return freighterWalletProvider.getAddress();
}

/**
 * @deprecated Use `FreighterWalletProvider.signTransaction()` instead.
 */
export async function signTransactionWithFreighter(
  transactionXdr: string,
  networkPassphrase: string,
  accountToSign?: string
): Promise<string> {
  return freighterWalletProvider.signTransaction(transactionXdr, networkPassphrase, accountToSign);
}

// Re-export types so consumers don't need a separate import.
export type { WalletConnection, WalletProvider };
