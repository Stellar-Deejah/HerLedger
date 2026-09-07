// ---------------------------------------------------------------------------
// AUTO-GENERATED — DO NOT EDIT BY HAND.
//
// Generated from `stellar contract inspect` output for the BusinessRegistry
// contract (herledger-contract/contracts/business_registry). Regenerate with:
//
//   pnpm --filter @herledger/sdk generate:abi
//
// CI re-runs this generation and fails the build if this file's contents
// differ from what's committed — see .github/workflows/ci.yml (job: abi-check).
// A non-empty diff here means the deployed contract's interface changed and
// the hand-written client in `contracts/business-registry.ts` needs review.
// ---------------------------------------------------------------------------

/** Mirrors the `Business` struct (business_registry/src/types.rs). */
export interface BusinessRegistryBusinessAbi {
  id: string; // BytesN<32>, hex-encoded
  owner: string; // Address
  wallet: string; // Address
  metadata_hash: string; // BytesN<32>, hex-encoded
  active: boolean;
}

/** Function signatures exposed by the BusinessRegistry contract, as declared in lib.rs. */
export interface BusinessRegistryAbi {
  initialize(admin: string): void;

  register_business(
    business_id: string,
    owner: string,
    wallet: string,
    metadata_hash: string
  ): void;

  update_metadata(business_id: string, metadata_hash: string): void;

  deactivate_business(business_id: string): void;

  get_business(business_id: string): BusinessRegistryBusinessAbi | null;

  get_business_by_wallet(wallet: string): BusinessRegistryBusinessAbi | null;
}

/** Function names, used by the CI diff check to flag added/removed/renamed methods. */
export const BUSINESS_REGISTRY_METHODS = [
  "initialize",
  "register_business",
  "update_metadata",
  "deactivate_business",
  "get_business",
  "get_business_by_wallet",
] as const;
