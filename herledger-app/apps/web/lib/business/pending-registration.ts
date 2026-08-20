// ---------------------------------------------------------------------------
// PendingRegistration localStorage schema
//
// registerBusiness() submits + signs a transaction and then waits (via
// submitAndWait/pollTransactionStatus) for on-chain confirmation before
// useRegistrationFlow ever POSTs to /api/business/register. If the tab
// closes during that wait, the transaction may already be on-chain with no
// app-side record of it -- there's nothing left in memory to resume from.
//
// We persist just enough here, written the instant a hash exists (see
// `onSubmitted` in packages/sdk/src/rpc/transactions.ts's submitAndWait),
// to resume polling the same hash and finish the DB write on the next
// load, without re-signing or resubmitting anything on-chain.
// ---------------------------------------------------------------------------

const STORAGE_KEY = "herledger:pending-registration";

export interface PendingRegistration {
  businessId: string;
  walletAddress: string;
  displayName: string;
  metadataHash: string;
  txHash: string;
  submittedAt: string;
}

export function writePendingRegistration(registration: PendingRegistration): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(registration));
  } catch {
    // localStorage can throw (private browsing, quota, disabled storage) --
    // resumability is a nice-to-have, not worth failing the registration over.
  }
}

export function readPendingRegistration(): PendingRegistration | null {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isPendingRegistration(parsed)) {
      clearPendingRegistration();
      return null;
    }
    return parsed;
  } catch {
    clearPendingRegistration();
    return null;
  }
}

export function clearPendingRegistration(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do if storage is unavailable.
  }
}

function isPendingRegistration(value: unknown): value is PendingRegistration {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    typeof record.businessId === "string" &&
    typeof record.walletAddress === "string" &&
    typeof record.displayName === "string" &&
    typeof record.metadataHash === "string" &&
    typeof record.txHash === "string" &&
    typeof record.submittedAt === "string"
  );
}
