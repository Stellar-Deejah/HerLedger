// ---------------------------------------------------------------------------
// Attester registry — resolves known attester Stellar addresses to
// human-readable display names (auditing firms, partner institutions, etc).
//
// This is a static, hand-maintained JSON map for now. It is deliberately
// NOT the on-chain source of truth: `AttestationRegistry.register_attester`
// on-chain is what actually grants an address attester privileges. This map
// only affects display — an address absent here is still a fully valid
// attester, it just renders as a truncated address instead of a name.
//
// Maintenance: add an entry here (keyed by the attester's Stellar `G...`
// address) whenever a new attester is onboarded via `registerAttester`.
// A future iteration could move this on-chain (e.g. a metadata field on
// the attester registry contract) once names need to be queryable outside
// this app; a static map is the right amount of infrastructure while the
// attester set is small and changes rarely.
// ---------------------------------------------------------------------------

export interface AttesterRegistryEntry {
  /** Human-readable display name shown in place of the raw address. */
  name: string;
  /** Optional short description of the attester's role (e.g. "Auditing firm"). */
  description?: string;
}

export type AttesterRegistry = Record<string, AttesterRegistryEntry>;

/**
 * Known attester addresses, keyed by Stellar `G...` public key.
 * Empty by default — populate as attesters are onboarded.
 */
export const KNOWN_ATTESTERS: AttesterRegistry = {};

/**
 * Resolve an attester address to its known display name.
 * Falls back to a truncated form of the address when the attester is not
 * in the registry (e.g. `GABCDE…WXYZ0`), so unknown attesters are still
 * legible rather than rendering as raw 56-character strkeys.
 *
 * @param address - The attester's Stellar `G...` address.
 * @param registry - The registry to look the address up in; defaults to
 *   {@link KNOWN_ATTESTERS}.
 * @returns The known display name, or a truncated address fallback.
 *
 * @example
 * ```ts
 * resolveAttesterName("G…"); // "Acme Auditing" or "GABCDE…WXYZ0"
 * ```
 */
export function resolveAttesterName(
  address: string,
  registry: AttesterRegistry = KNOWN_ATTESTERS
): string {
  const known = registry[address];
  if (known) return known.name;
  return truncateAddress(address);
}

function truncateAddress(address: string, chars = 6): string {
  if (address.length <= chars * 2 + 3) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
