import type { EventStatus } from "@herledger/sdk/types";

// ---------------------------------------------------------------------------
// Dispute lifecycle state machine
//
// On-chain `EventStatus` (Pending | Verified | Disputed | Revoked) is the
// coarse, authoritative signal for a FinancialEvent, but it cannot express
// the finer-grained off-chain dispute workflow HerLedger wants to show
// business owners: Submitted -> Investigating -> (Resolved | Revoked).
//
// `DisputeStatus` (see prisma/schema.prisma) tracks that finer workflow.
// The two are reconciled by `deriveDisputeLifecycleStatus`:
//
//   EventStatus.Verified  -> always forces DisputeStatus.Resolved
//     (the arbiter called resolve_dispute(valid = true); the original
//     event stands, and the dispute is closed in the reporter's favor)
//   EventStatus.Revoked   -> always forces DisputeStatus.Revoked
//     (resolve_dispute(valid = false) or revoke_event; the event itself
//     was invalidated)
//   EventStatus.Disputed  -> keeps whatever DisputeStatus is already
//     stored (Submitted or Investigating) -- the on-chain enum has no
//     "Investigating" concept, so that transition is purely app-side.
//   EventStatus.Pending   -> no dispute-relevant transition; keep the
//     stored DisputeStatus as-is (this combination should not normally
//     occur once a dispute has been submitted).
//
// EventStatus wins over a stale stored DisputeStatus once a resolution has
// happened on-chain: a dispute cannot stay "Submitted" forever if the event
// has already been verified or revoked. This function is pure so it can be
// unit tested and reused by both the GET /api/disputes/:eventId route
// (to self-heal a stale Dispute.status) and the DisputeList UI.
// ---------------------------------------------------------------------------

export type DisputeStatus = "Submitted" | "Investigating" | "Resolved" | "Revoked";

export function deriveDisputeLifecycleStatus(
  eventStatus: EventStatus,
  storedStatus: DisputeStatus
): DisputeStatus {
  if (eventStatus === "Verified") return "Resolved";
  if (eventStatus === "Revoked") return "Revoked";
  return storedStatus;
}

/** Human-readable label + tone for each dispute lifecycle state, for UI badges. */
export const DISPUTE_STATUS_LABELS: Record<
  DisputeStatus,
  { label: string; background: string; color: string }
> = {
  Submitted: { label: "Submitted", background: "#fef9c3", color: "#854d0e" },
  Investigating: { label: "Investigating", background: "#dbeafe", color: "#1e40af" },
  Resolved: { label: "Resolved", background: "#dcfce7", color: "#166534" },
  Revoked: { label: "Revoked", background: "#fee2e2", color: "#991b1b" },
};

/** A dispute's resolution is only meaningful once it has left the active workflow. */
export function isDisputeTerminal(status: DisputeStatus): boolean {
  return status === "Resolved" || status === "Revoked";
}
