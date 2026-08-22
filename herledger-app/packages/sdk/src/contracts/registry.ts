import type { ContractAddress } from "../types/branded.js";
import type { NetworkId } from "../types/index.js";
import { ValidationError } from "../errors/index.js";

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
 *
 * @param input - Per-contract address entries for each network.
 * @returns A registry keyed by contract name.
 *
 * @example
 * ```ts
 * const registry = createContractAddressRegistry({
 *   businessRegistry: { testnet: "C…" },
 *   financialLedger: { testnet: "C…" },
 *   attestationRegistry: { testnet: "C…" },
 * });
 * ```
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
 *
 * @param network - The network the addresses belong to.
 * @param addresses - The raw contract ID strings for all three contracts.
 * @returns A registry with each address registered under `network`.
 *
 * @example
 * ```ts
 * const registry = registerCurrentNetworkAddresses("testnet", {
 *   businessRegistryId: env.BUSINESS_REGISTRY_CONTRACT_ID,
 *   financialLedgerId: env.FINANCIAL_LEDGER_CONTRACT_ID,
 *   attestationRegistryId: env.ATTESTATION_REGISTRY_CONTRACT_ID,
 * });
 * ```
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
 * @param name - The contract the address is expected to belong to.
 * @param address - The raw address string to validate.
 * @param network - The network to look the address up for.
 * @param registry - The registry to check the address against.
 * @returns The validated address branded as a `ContractAddress`.
 * @throws {ValidationError} if `address` is malformed, missing from the
 *   registry for `network`, or does not match the registered value.
 *
 * @example
 * ```ts
 * const id = toContractAddress("BusinessRegistry", rawId, "testnet", registry);
 * ```
 */
export function toContractAddress(
  name: ContractName,
  address: string,
  network: NetworkId,
  registry: ContractAddressRegistry
): ContractAddress {
  if (!looksLikeContractAddress(address)) {
    throw new ValidationError(
      `${name}: "${address}" is not a well-formed Stellar contract address`
    );
  }

  const expected = registry[name][network];
  if (!expected) {
    throw new ValidationError(
      `${name}: no registered address for network "${network}". ` +
        `Populate CONTRACT_ADDRESSES (or the env vars that feed it) before use.`
    );
  }

  if (expected !== address) {
    throw new ValidationError(
      `${name}: address "${address}" does not match the registered ${network} ` +
        `address "${expected}". Refusing to call — this usually means the wrong ` +
        `contract ID was passed (e.g. a swapped env var).`
    );
  }

  return address as ContractAddress;
}

/**
 * Convenience: validate all three known contract addresses at once and
 * return a ready-to-use `ContractConfig`. Prefer this over calling
 * `toContractAddress` three times by hand at your app's composition root
 * (e.g. `apps/web/lib/stellar/network.ts`).
 *
 * @param registry - The registry to validate against.
 * @param network - The network the addresses belong to.
 * @param addresses - The raw contract ID strings for all three contracts.
 * @returns A `ContractConfig` with branded `ContractAddress` fields.
 * @throws {ValidationError} if any address is malformed or mismatched.
 *
 * @example
 * ```ts
 * const config = buildContractConfig(registry, "testnet", rawIds);
 * ```
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
