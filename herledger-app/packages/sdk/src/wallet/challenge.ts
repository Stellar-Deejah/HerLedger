import { Keypair } from "@stellar/stellar-sdk";
import { signMessage } from "@stellar/freighter-api";
import { WalletError } from "../errors/index.js";

// ---------------------------------------------------------------------------
// Wallet ownership challenge — used to re-link a Stellar wallet to a
// business profile from the settings panel.
//
// Freighter is a signer only (see wallet/freighter.ts) — the challenge
// message never triggers a transaction and costs no fees. Proving control
// of a wallet is just: build a message binding (business, wallet, nonce,
// time), have Freighter sign it, and verify the signature against the
// claimed wallet's public key server-side.
// ---------------------------------------------------------------------------

export interface WalletLinkChallengeParams {
  /** On-chain business ID (hex-encoded BytesN<32>) the wallet is being linked to. */
  businessId: string;
  /** The Stellar wallet address (G...) being proven. */
  walletAddress: string;
  /** Server-issued random nonce — prevents a stale signature being replayed for a different link attempt. */
  nonce: string;
  /** ISO-8601 timestamp the challenge was issued at — bounds how long a signature stays valid. */
  issuedAt: string;
}

/** Default validity window for a challenge, from `issuedAt`. */
export const WALLET_LINK_CHALLENGE_TTL_MS = 5 * 60 * 1000;

/**
 * Generates a random nonce for a wallet-link challenge. Uses the Web Crypto
 * API (`crypto.randomUUID`), available in both the browser and Node — no
 * `node:crypto` import, so this stays safe to bundle into client code.
 */
export function generateWalletLinkNonce(): string {
  return globalThis.crypto.randomUUID();
}

/**
 * Builds the canonical challenge message a wallet owner must sign to prove
 * control of `walletAddress` before it can be (re-)linked to `businessId`.
 * Server and client must build this identically — the server reconstructs
 * it from the same params when verifying, rather than storing the message.
 */
export function buildWalletLinkChallengeMessage(params: WalletLinkChallengeParams): string {
  const { businessId, walletAddress, nonce, issuedAt } = params;
  return [
    "HerLedger wallet ownership verification",
    `Business ID: ${businessId}`,
    `Wallet: ${walletAddress}`,
    `Nonce: ${nonce}`,
    `Issued At: ${issuedAt}`,
    "",
    "Signing this message proves you control this wallet and links it to " +
      "your HerLedger business profile. It does not submit an on-chain " +
      "transaction and costs no fees.",
  ].join("\n");
}

/**
 * Whether a challenge issued at `issuedAt` has aged past `ttlMs`. Used
 * server-side when verifying a submitted signature — an old signature for
 * an expired challenge must be rejected even if it is otherwise valid.
 */
export function isWalletLinkChallengeExpired(
  issuedAt: string,
  ttlMs: number = WALLET_LINK_CHALLENGE_TTL_MS
): boolean {
  const issuedTime = new Date(issuedAt).getTime();
  if (Number.isNaN(issuedTime)) return true;
  return Date.now() - issuedTime > ttlMs;
}

/**
 * Signs a wallet-link challenge message with Freighter. Must run in a
 * browser context with the Freighter extension installed and unlocked.
 * Returns a base64-encoded signature suitable for
 * `verifyWalletLinkChallengeSignature`.
 */
export async function signWalletLinkChallenge(
  message: string,
  walletAddress: string
): Promise<string> {
  let result: Awaited<ReturnType<typeof signMessage>>;
  try {
    result = await signMessage(message, { address: walletAddress });
  } catch (cause) {
    throw new WalletError("Failed to sign wallet verification message with Freighter", cause);
  }

  if (result.error) {
    throw new WalletError(`Freighter signing rejected: ${result.error}`);
  }
  if (!result.signedMessage) {
    throw new WalletError("Freighter returned no signed message");
  }
  if (typeof result.signedMessage !== "string") {
    // Freighter's SDK types allow a Buffer response from older extension
    // versions; the installed API version returns base64 strings in the
    // browser. Fail loudly rather than mis-encode an unexpected shape.
    throw new WalletError("Unexpected signed message format returned by Freighter");
  }

  return result.signedMessage;
}

/**
 * Verifies a Freighter-signed wallet-link challenge server-side: confirms
 * `signatureBase64` is a valid Ed25519 signature over the exact UTF-8 bytes
 * of `message`, produced by the private key for `walletAddress`. Returns
 * `false` (never throws) for a malformed address or signature so callers
 * can treat verification as a single boolean gate.
 */
export function verifyWalletLinkChallengeSignature(
  message: string,
  signatureBase64: string,
  walletAddress: string
): boolean {
  try {
    const keypair = Keypair.fromPublicKey(walletAddress);
    const signature = Buffer.from(signatureBase64, "base64");
    return keypair.verify(Buffer.from(message, "utf8"), signature);
  } catch {
    return false;
  }
}
