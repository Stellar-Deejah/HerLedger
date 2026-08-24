import type { ContractAddress } from "../types/branded.js";
import type { NetworkId } from "../types/index.js";
import { ValidationError, ValidationErrorCode } from "../errors/index.js";

// ---------------------------------------------------------------------------
// Contract address registry.
//
// Maps each HerLedger contract to its known address per network. This is the
// single source of truth an incoming address is checked against before the
// SDK will treat it as trustworthy — closing the "wrong contract address
// passed to the wrong function" risk described in issue #59.
//
// `mainnet` entries are optional because HerLedger has not deployed to
// mainnet yet. Attempting to build a mainnet ContractConfig before an
// address is registered here throws a ValidationError with a clear message,
// rather than silently sending calls to `undefined`.
// ---------------------------------------------------------------------------

export const CONTRACT_NAMES = [
  "BusinessRegistry",
  "FinancialLedger",
  "AttestationRegistry",
] as const;

export type ContractName = (typeof CONTRACT_NAMES)[number];

export interface ContractAddressRegistryEntry {
  testnet?: string;
  mainnet?: string;
}

export type ContractAddressRegistry = Record<ContractName, ContractAddressRegistryEntry>;

/**
 * Build a `ContractAddressRegistry` from raw address inputs (typically read
 * from environment variables by the caller). This does not itself perform
 * env validation — that stays the job of `@herledger/config`. This function
 * only shapes whatever addresses you already have into the registry format
 * `toContractAddress` / `buildContractConfig` expect.
 *
 * Both `testnet` and `mainnet` are optional per contract: HerLedger's env
 * schema only exposes a single set of `*_CONTRACT_ID` vars, which point at
 * whichever network `STELLAR_NETWORK` / `NEXT_PUBLIC_STELLAR_NETWORK` is
 * currently set to. Register the address under the *actual* current network
 * — see `registerCurrentNetworkAddresses` below for the common case.
 */
export function createContractAddressRegistry(input: {
  businessRegistry: ContractAddressRegistryEntry;
  financialLedger: ContractAddressRegistryEntry;
  attestationRegistry: ContractAddressRegistryEntry;
}): ContractAddressRegistry {
  return {
    BusinessRegistry: input.businessRegistry,
    FinancialLedger: input.financialLedger,
    AttestationRegistry: input.attestationRegistry,
  };
}

/**
 * Convenience for the common HerLedger case: a single set of contract IDs
 * that apply to whichever network is currently configured (there's no
 * separate `*_CONTRACT_ID_MAINNET` env var today — see `.env.example`).
 * Registers each address under `network`'s key rather than assuming testnet.
 */
export function registerCurrentNetworkAddresses(
  network: NetworkId,
  addresses: {
    businessRegistryId: string;
    financialLedgerId: string;
    attestationRegistryId: string;
  }
): ContractAddressRegistry {
  return createContractAddressRegistry({
    businessRegistry: { [network]: addresses.businessRegistryId },
    financialLedger: { [network]: addresses.financialLedgerId },
    attestationRegistry: { [network]: addresses.attestationRegistryId },
  });
}

/**
 * Minimal structural check that a string looks like a Stellar contract
 * address (StrKey-encoded, starts with `C`, 56 characters). This is not a
 * full StrKey checksum validation — `@stellar/stellar-sdk`'s `Contract`
 * constructor will reject a malformed value regardless — but it lets us
 * fail with a clear `ValidationError` instead of an opaque SDK error.
 */
function looksLikeContractAddress(value: string): boolean {
  return /^C[A-Z0-9]{55}$/.test(value);
}

/**
 * Validate `address` against the registry entry for `name` on `network` and
 * return it as a branded `ContractAddress`. This is the *only* sanctioned
 * way to produce a `ContractAddress` — every SDK contract function accepts
 * `ContractAddress` rather than `string`, so a value that hasn't passed
 * through here cannot be used (short of an explicit `as` type assertion,
 * which contributors should never need to reach for).
 *
 * @throws {ValidationError} if `address` is malformed, missing from the
 * registry for `network`, or does not match the registered value.
 */
export function toContractAddress(
  name: ContractName,
  address: string,
  network: NetworkId,
  registry: ContractAddressRegistry
): ContractAddress {
  if (!looksLikeContractAddress(address)) {
    throw new ValidationError(
      ValidationErrorCode.MALFORMED_INPUT,
      `${name}: "${address}" is not a well-formed Stellar contract address`,
      { context: { field: name, value: address } }
    );
  }

  const expected = registry[name][network];
  if (!expected) {
    throw new ValidationError(
      ValidationErrorCode.ADDRESS_NOT_REGISTERED,
      `${name}: no registered address for network "${network}". ` +
        `Populate CONTRACT_ADDRESSES (or the env vars that feed it) before use.`,
      { context: { field: name, value: address } }
    );
  }

  if (expected !== address) {
    throw new ValidationError(
      ValidationErrorCode.ADDRESS_MISMATCH,
      `${name}: address "${address}" does not match the registered ${network} ` +
        `address "${expected}". Refusing to call — this usually means the wrong ` +
        `contract ID was passed (e.g. a swapped env var).`,
      { context: { field: name, value: address } }
    );
  }

  return address as ContractAddress;
}

/**
 * Convenience: validate all three known contract addresses at once and
 * return a ready-to-use `ContractConfig`. Prefer this over calling
 * `toContractAddress` three times by hand at your app's composition root
 * (e.g. `apps/web/lib/stellar/network.ts`).
 */
export function buildContractConfig(
  registry: ContractAddressRegistry,
  network: NetworkId,
  addresses: {
    businessRegistryId: string;
    financialLedgerId: string;
    attestationRegistryId: string;
  }
): {
  businessRegistryId: ContractAddress;
  financialLedgerId: ContractAddress;
  attestationRegistryId: ContractAddress;
} {
  return {
    businessRegistryId: toContractAddress(
      "BusinessRegistry",
      addresses.businessRegistryId,
      network,
      registry
    ),
    financialLedgerId: toContractAddress(
      "FinancialLedger",
      addresses.financialLedgerId,
      network,
      registry
    ),
    attestationRegistryId: toContractAddress(
      "AttestationRegistry",
      addresses.attestationRegistryId,
      network,
      registry
    ),
  };
}
