// ---------------------------------------------------------------------------
// Application-level types mirroring on-chain contract structures
// ---------------------------------------------------------------------------
export type { Brand, ContractAddress, HexString32 } from "./branded.js";
import type { ContractAddress } from "./branded.js";
export interface Business {
  id: string; // hex-encoded BytesN<32>
  owner: string; // Stellar address
  wallet: string; // Stellar address
  metadataHash: string; // hex-encoded BytesN<32>
  active: boolean;
}
export type EventType =
  | "PaymentReceived"
  | "PaymentSent"
  | "InvoiceSettled"
  | "CommitmentFulfilled";
export type EventStatus = "Pending" | "Verified" | "Disputed" | "Revoked";
export interface FinancialEvent {
  id: string; // hex-encoded BytesN<32>
  businessId: string; // hex-encoded BytesN<32>
  eventType: EventType;
  asset: string; // Stellar asset contract address
  amount: bigint; // i128 -- always bigint, never Number
  stellarReference: string; // hex-encoded BytesN<32>
  metadataHash: string; // hex-encoded BytesN<32>
  status: EventStatus;
  createdAt: bigint; // u64 ledger sequence
}
export type AttestationStatus = "Active" | "Revoked";
export interface Attester {
  address: string;
  active: boolean;
  metadataHash: string; // hex-encoded BytesN<32>
}
export interface Attestation {
  id: string; // hex-encoded BytesN<32>
  eventId: string; // hex-encoded BytesN<32>
  attester: string; // Stellar address
  claimHash: string; // hex-encoded BytesN<32>
  issuedAt: bigint; // u64
  status: AttestationStatus;
}
/** The two Stellar networks HerLedger targets. Mirrors `STELLAR_NETWORK` / `NEXT_PUBLIC_STELLAR_NETWORK`. */
export type NetworkId = "testnet" | "mainnet";
export interface StellarNetworkConfig {
  network: NetworkId;
  rpcUrl: string;
  horizonUrl: string;
  networkPassphrase: string;
}
/**
 * Contract addresses for the three HerLedger Soroban contracts.
 *
 * Fields are `ContractAddress`, not `string` -- a value can only end up here
 * via `toContractAddress()` / `buildContractConfig()` in
 * `contracts/registry.ts`, which validates it against `CONTRACT_ADDRESSES`
 * for the target network. Passing a raw string (e.g. an env var read
 * directly, or an address for the wrong contract) is a compile error.
 *
 * See `contracts/registry.ts` for how to construct one.
 */
export interface ContractConfig {
  businessRegistryId: ContractAddress;
  financialLedgerId: ContractAddress;
  attestationRegistryId: ContractAddress;
}
export interface TransactionResult {
  hash: string;
  success: boolean;
  ledger?: number;
}

/**
 * Interface for transaction signing - allows injecting different wallet adapters
 */
export interface TransactionSigner {
  signTransaction(xdr: string, passphrase: string, account?: string): Promise<string>;
}
