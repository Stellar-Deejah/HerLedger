import {
  isConnected,
  getAddress,
  signTransaction,
  requestAccess,
  getNetwork,
} from "@stellar/freighter-api";
import { WalletError } from "../errors/index.js";
import type { WalletConnection, WalletProvider } from "./types.js";

// ---------------------------------------------------------------------------
// FreighterWalletProvider
// Implements WalletProvider by delegating to the Freighter browser extension.
// ---------------------------------------------------------------------------

/**
 * Wallet adapter that wraps the Freighter browser extension.
 *
 * Use this class via the `WalletProvider` interface so that future adapters
 * (Albedo, xBull, WalletConnect …) can be swapped in without touching call
 * sites.
 *
 * @example
 * ```ts
 * const wallet: WalletProvider = new FreighterWalletProvider();
 * const { publicKey } = await wallet.connect();
 * const signed = await wallet.signTransaction(xdr, passphrase);
 * await wallet.disconnect();
 * ```
 */
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
   * Request access to the user's Freighter wallet.
   * Returns the connected public key and network.
   * Throws `WalletError` on failure or user rejection.
   */
  async connect(): Promise<WalletConnection> {
    const available = await this.isAvailable();
    if (!available) {
      throw new WalletError(
        "Freighter wallet extension is not installed or not available. Please install Freighter to continue."
      );
    }

    let accessResult: Awaited<ReturnType<typeof requestAccess>>;
    try {
      accessResult = await requestAccess();
    } catch (cause) {
      throw new WalletError("Failed to request Freighter access", cause);
    }

    if (accessResult.error) {
      throw new WalletError(`Freighter access denied: ${accessResult.error}`);
    }

    let addressResult: Awaited<ReturnType<typeof getAddress>>;
    try {
      addressResult = await getAddress();
    } catch (cause) {
      throw new WalletError("Failed to retrieve wallet address from Freighter", cause);
    }

    if (addressResult.error || !addressResult.address) {
      throw new WalletError(
        `Could not retrieve wallet address: ${addressResult.error ?? "unknown error"}`
      );
    }

    let networkResult: Awaited<ReturnType<typeof getNetwork>>;
    try {
      networkResult = await getNetwork();
    } catch (cause) {
      throw new WalletError("Failed to retrieve network from Freighter", cause);
    }

    return {
      publicKey: addressResult.address,
      network: networkResult.network ?? "UNKNOWN",
    };
  }

  /**
   * Disconnect the wallet.
   * Freighter has no explicit disconnect API; this resolves immediately and
   * is a no-op at the extension level.
   */
  async disconnect(): Promise<void> {
    // Freighter does not expose a disconnect call; the session state lives
    // inside the extension. This method is a hook for adapters that do have
    // session teardown logic (e.g. WalletConnect).
  }

  /**
   * Return the currently connected public key without prompting for access.
   * Returns `null` if no wallet is connected.
   */
  async getAddress(): Promise<string | null> {
    try {
      const result = await getAddress();
      if (result.error || !result.address) return null;
      return result.address;
    } catch {
      return null;
    }
  }

  /**
   * Sign a transaction XDR string using Freighter.
   * Returns the signed XDR.
   * Throws `WalletError` if the user rejects or Freighter is unavailable.
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
      throw new WalletError("Failed to sign transaction with Freighter", cause);
    }

    if (result.error) {
      throw new WalletError(`Freighter signing rejected: ${result.error}`);
    }

    if (!result.signedTxXdr) {
      throw new WalletError("Freighter returned no signed transaction XDR");
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
 * @deprecated Use `FreighterWalletProvider.signTransaction()` or the `useWallet()` hook instead.
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
