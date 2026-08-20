import type { AttestationStatus } from "@herledger/sdk";

/**
 * Compare a DB-indexed attestation status against the result of an
 * on-chain `isValidAttestation` read. Returns true when they disagree —
 * e.g. the DB says "Active" but the contract says the attestation has
 * been revoked (or the reverse, which shouldn't normally happen but is
 * still worth flagging as a sync bug if it does).
 */
export function hasStatusDiscrepancy(dbStatus: AttestationStatus, onChainValid: boolean): boolean {
  const expectedValid = dbStatus === "Active";
  return expectedValid !== onChainValid;
}
