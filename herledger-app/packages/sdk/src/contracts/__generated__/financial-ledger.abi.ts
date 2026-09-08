// ---------------------------------------------------------------------------
// AUTO-GENERATED — DO NOT EDIT BY HAND.
//
// Generated from `stellar contract inspect` output for the FinancialLedger
// contract (herledger-contract/contracts/financial_ledger). Regenerate with:
//
//   pnpm --filter @herledger/sdk generate:abi
//
// CI re-runs this generation and fails the build if this file's contents
// differ from what's committed — see .github/workflows/ci.yml (job: abi-check).
// ---------------------------------------------------------------------------

/** Mirrors the `EventType` enum (financial_ledger/src/types.rs). Unit-variant Soroban enum. */
export type FinancialLedgerEventTypeAbi =
  | "PaymentReceived"
  | "PaymentSent"
  | "InvoiceSettled"
  | "CommitmentFulfilled";

/** Mirrors the `EventStatus` enum (financial_ledger/src/types.rs). Unit-variant Soroban enum. */
export type FinancialLedgerEventStatusAbi = "Pending" | "Verified" | "Disputed" | "Revoked";

/** Mirrors the `FinancialEvent` struct (financial_ledger/src/types.rs). */
export interface FinancialLedgerEventAbi {
  id: string; // BytesN<32>, hex-encoded
  business_id: string; // BytesN<32>, hex-encoded
  event_type: FinancialLedgerEventTypeAbi;
  asset: string; // Address
  amount: bigint; // i128
  stellar_reference: string; // BytesN<32>, hex-encoded
  metadata_hash: string; // BytesN<32>, hex-encoded
  status: FinancialLedgerEventStatusAbi;
  created_at: bigint; // u64, ledger sequence
}

/**
 * Function signatures exposed by the FinancialLedger contract, as declared in lib.rs.
 *
 * `dispute_event` takes `business_owner` as an explicit argument (the
 * contract calls `business_owner.require_auth()` directly rather than
 * loading the owner from the event's associated business record) — this
 * was previously missing from the hand-written client; see
 * contracts/financial-ledger.ts.
 */
export interface FinancialLedgerAbi {
  initialize(admin: string, recorder: string, resolver: string): void;

  add_supported_asset(asset: string): void;
  remove_supported_asset(asset: string): void;
  is_supported_asset(asset: string): boolean;

  record_event(
    event_id: string,
    business_id: string,
    event_type: FinancialLedgerEventTypeAbi,
    asset: string,
    amount: bigint,
    stellar_reference: string,
    metadata_hash: string
  ): void;

  verify_event(event_id: string): void;

  dispute_event(event_id: string, business_owner: string, reason_hash: string): void;

  resolve_dispute(event_id: string, valid: boolean, resolution_hash: string): void;

  revoke_event(event_id: string, reason_hash: string): void;

  get_event(event_id: string): FinancialLedgerEventAbi | null;

  get_business_events(
    business_id: string,
    offset: number,
    limit: number
  ): FinancialLedgerEventAbi[];
}

/** Function names, used by the CI diff check to flag added/removed/renamed methods. */
export const FINANCIAL_LEDGER_METHODS = [
  "initialize",
  "add_supported_asset",
  "remove_supported_asset",
  "is_supported_asset",
  "record_event",
  "verify_event",
  "dispute_event",
  "resolve_dispute",
  "revoke_event",
  "get_event",
  "get_business_events",
] as const;
