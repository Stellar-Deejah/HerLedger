import { z } from "zod";

// ---------------------------------------------------------------------------
// Zod schemas for decoded Soroban contract event payloads.
//
// Every event below is declared with `#[contractevent]` in one of the three
// HerLedger contracts (see `herledger-contract/contracts/*/src/lib.rs`). That
// macro publishes a single topic -- the struct's name, as a `Symbol` -- and a
// data payload encoding the struct's fields as a map keyed by field-name
// symbols, exactly like the `FinancialEvent` struct decoded in
// `packages/sdk/src/contracts/financial-ledger.ts` (`decodeFinancialEvent`).
//
// These schemas validate that decoded shape *after* XDR decoding (Zod has no
// notion of XDR itself). If a contract is upgraded with a new/renamed field,
// or the topic no longer matches any of these keys, decoding still succeeds
// as far as XDR is concerned but produces a plain object that fails one of
// these schemas -- `parseContractEvents` turns that into a `ParseError`
// instead of quietly building a malformed domain object.
// ---------------------------------------------------------------------------

/** Lowercase hex encoding of a `BytesN<32>`, as produced by `decodeBytes32`. */
const hex32 = z
  .string()
  .regex(/^[0-9a-f]{64}$/, "expected a 64-character lowercase hex BytesN<32>");

/** A Stellar `Address` (account "G..." or contract "C..."), as produced by `decodeAddress`. */
const stellarAddress = z
  .string()
  .regex(/^[GC][A-Z2-7]{55}$/, "expected a Stellar G/C address (56-char base32)");

// --- financial_ledger -------------------------------------------------------

export const SupportedAssetAddedSchema = z.object({ asset: stellarAddress });
export const SupportedAssetRemovedSchema = z.object({ asset: stellarAddress });
export const FinancialEventRecordedSchema = z.object({
  event_id: hex32,
  business_id: hex32,
});
export const FinancialEventVerifiedSchema = z.object({
  event_id: hex32,
  business_id: hex32,
});
export const FinancialEventDisputedSchema = z.object({
  event_id: hex32,
  business_id: hex32,
  reason_hash: hex32,
});
export const FinancialEventRevokedSchema = z.object({
  event_id: hex32,
  business_id: hex32,
  reason_hash: hex32,
});

// --- business_registry -------------------------------------------------------

export const BusinessRegisteredSchema = z.object({
  business_id: hex32,
  owner: stellarAddress,
  wallet: stellarAddress,
});
export const BusinessMetadataUpdatedSchema = z.object({
  business_id: hex32,
  owner: stellarAddress,
});
export const BusinessDeactivatedSchema = z.object({
  business_id: hex32,
  owner: stellarAddress,
});

// --- attestation_registry ----------------------------------------------------

export const AttesterRegisteredSchema = z.object({ attester: stellarAddress });
export const AttesterDeactivatedSchema = z.object({ attester: stellarAddress });
export const AttestationCreatedSchema = z.object({
  attestation_id: hex32,
  event_id: hex32,
  attester: stellarAddress,
});
export const AttestationRevokedSchema = z.object({
  attestation_id: hex32,
  event_id: hex32,
  reason_hash: hex32,
});

/**
 * Every supported contract event topic, mapped to the schema its decoded
 * value must satisfy. Keys are the exact struct names the `#[contractevent]`
 * macro emits as the event's first (and only) topic.
 */
export const CONTRACT_EVENT_SCHEMAS = {
  SupportedAssetAdded: SupportedAssetAddedSchema,
  SupportedAssetRemoved: SupportedAssetRemovedSchema,
  FinancialEventRecorded: FinancialEventRecordedSchema,
  FinancialEventVerified: FinancialEventVerifiedSchema,
  FinancialEventDisputed: FinancialEventDisputedSchema,
  FinancialEventRevoked: FinancialEventRevokedSchema,
  BusinessRegistered: BusinessRegisteredSchema,
  BusinessMetadataUpdated: BusinessMetadataUpdatedSchema,
  BusinessDeactivated: BusinessDeactivatedSchema,
  AttesterRegistered: AttesterRegisteredSchema,
  AttesterDeactivated: AttesterDeactivatedSchema,
  AttestationCreated: AttestationCreatedSchema,
  AttestationRevoked: AttestationRevokedSchema,
} as const;

export type ContractEventTopic = keyof typeof CONTRACT_EVENT_SCHEMAS;

export function isKnownContractEventTopic(topic: string): topic is ContractEventTopic {
  return Object.hasOwn(CONTRACT_EVENT_SCHEMAS, topic);
}
