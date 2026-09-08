// ---------------------------------------------------------------------------
// AUTO-GENERATED — DO NOT EDIT BY HAND.
//
// Generated from `stellar contract inspect` output for the
// AttestationRegistry contract (herledger-contract/contracts/attestation_registry).
// Regenerate with:
//
//   pnpm --filter @herledger/sdk generate:abi
//
// CI re-runs this generation and fails the build if this file's contents
// differ from what's committed — see .github/workflows/ci.yml (job: abi-check).
// ---------------------------------------------------------------------------

/** Mirrors the `AttestationStatus` enum (attestation_registry/src/types.rs). Unit-variant Soroban enum. */
export type AttestationRegistryStatusAbi = "Active" | "Revoked";

/** Mirrors the `Attester` struct (attestation_registry/src/types.rs). */
export interface AttestationRegistryAttesterAbi {
  address: string; // Address
  active: boolean;
  metadata_hash: string; // BytesN<32>, hex-encoded
}

/** Mirrors the `Attestation` struct (attestation_registry/src/types.rs). */
export interface AttestationRegistryAttestationAbi {
  id: string; // BytesN<32>, hex-encoded
  event_id: string; // BytesN<32>, hex-encoded
  attester: string; // Address
  claim_hash: string; // BytesN<32>, hex-encoded
  issued_at: bigint; // u64
  status: AttestationRegistryStatusAbi;
}

/**
 * Function signatures exposed by the AttestationRegistry contract, as
 * declared in lib.rs.
 *
 * `create_attestation` takes `attester` as an explicit positional argument
 * (used for `attester.require_auth()` and the active-attester lookup) —
 * this was previously missing from the hand-written client; see
 * contracts/attestation-registry.ts.
 */
export interface AttestationRegistryAbi {
  initialize(admin: string): void;

  register_attester(attester: string, metadata_hash: string): void;
  deactivate_attester(attester: string): void;

  create_attestation(
    attestation_id: string,
    event_id: string,
    attester: string,
    claim_hash: string
  ): void;

  revoke_attestation(attestation_id: string, reason_hash: string): void;

  get_attestation(attestation_id: string): AttestationRegistryAttestationAbi | null;

  is_valid_attestation(attestation_id: string): boolean;
}

/** Function names, used by the CI diff check to flag added/removed/renamed methods. */
export const ATTESTATION_REGISTRY_METHODS = [
  "initialize",
  "register_attester",
  "deactivate_attester",
  "create_attestation",
  "revoke_attestation",
  "get_attestation",
  "is_valid_attestation",
] as const;
