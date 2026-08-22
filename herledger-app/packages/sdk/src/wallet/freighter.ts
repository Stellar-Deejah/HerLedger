import {
  isConnected,
  getAddress,
  signTransaction,
  requestAccess,
  getNetwork,
} from "@stellar/freighter-api";
import { WalletError } from "../errors/index.js";

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
 *
 * @returns `true` if Freighter reports an active connection, `false` if it is
 *   unavailable or throws.
 *
 * @example
 * ```ts
 * if (await isFreighterAvailable()) await connectWallet();
 * ```
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
export async function connectWallet(): Promise<WalletConnection> {
  const available = await isFreighterAvailable();
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
 * Get the currently connected public key without prompting for access.
 *
 * @returns The connected `G...` address, or `null` if no wallet is connected
 *   or Freighter is unavailable.
 *
 * @example
 * ```ts
 * const owner = await getConnectedAddress();
 * if (!owner) throw new Error("Connect a wallet first");
 * ```
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
 *
 * @example
 * ```ts
 * const signed = await signTransactionWithFreighter(
 *   prepared.toXDR(),
 *   config.networkPassphrase,
 *   params.owner
 * );
 * ```
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
