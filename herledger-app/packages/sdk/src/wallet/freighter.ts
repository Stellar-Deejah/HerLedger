import {
  isConnected,
  getAddress,
  signTransaction,
  requestAccess,
  getNetwork,
} from "@stellar/freighter-api";
import { WalletError, WalletErrorCode } from "../errors/index.js";

// ---------------------------------------------------------------------------
// Freighter wallet adapter
// Freighter is a signer only — not application authentication.
// ---------------------------------------------------------------------------

export interface WalletConnection {
  publicKey: string;
  network: string;
}

/**
 * Check whether the Freighter extension is available in this browser context.
 */
export async function isFreighterAvailable(): Promise<boolean> {
  try {
    const result = await isConnected();
    return result.isConnected;
  } catch {
    return false;
  }
}

/**
 * Request access to the user's Freighter wallet.
 * Returns the connected public key.
 * Throws WalletError on failure or rejection.
 */
export async function connectWallet(): Promise<WalletConnection> {
  const available = await isFreighterAvailable();
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
 * Get the currently connected public key without prompting for access.
 * Returns null if no wallet is connected.
 */
export async function getConnectedAddress(): Promise<string | null> {
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
 * Throws WalletError if the user rejects or if Freighter is unavailable.
 */
export async function signTransactionWithFreighter(
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
    throw new WalletError(WalletErrorCode.UNAVAILABLE, "Freighter returned no signed transaction XDR");
  }

  return result.signedTxXdr;
}
