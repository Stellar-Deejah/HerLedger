import "server-only";

import { getServerEnv } from "@herledger/config/server";
import { getDbClient, type AttestationStatus, type EventType } from "@herledger/db";
import type { EventStatus } from "@herledger/sdk";
import type { DisputeStatus } from "@prisma/client";

import { decryptDisputeReason, DisputeDecryptionError } from "@/lib/crypto/dispute-encryption";

// ---------------------------------------------------------------------------
// Data-access for a single financial event's full detail (event, attestations,
// dispute history, raw Stellar transaction), used by the RSC detail page at
// app/dashboard/activity/[eventId]/page.tsx.
//
// Unlike lib/data/activity.ts (the recent-activity list), this is NOT wrapped
// in unstable_cache: dispute reasons are decrypted per-request, and a detail
// page is a low-traffic, single-record fetch where caching buys little and
// risks serving a stale decrypted payload across requests.
//
// `businessId` and `eventId` not matching (or the event not existing at all)
// both collapse to `null` here -- deliberately not distinguished the way the
// API route distinguishes 404 vs 403 -- so the page can render a plain
// notFound() without confirming to a business that guesses another
// business's eventId in the URL bar whether that event exists.
// ---------------------------------------------------------------------------

export interface FinancialEventDetail {
  event: {
    id: string;
    eventId: string;
    eventType: EventType;
    assetAddress: string;
    amount: string;
    status: EventStatus;
    stellarReference: string;
    metadataHash: string;
    ledgerSequence: number;
    createdAt: Date;
    updatedAt: Date;
  };
  attestations: {
    id: string;
    attestationId: string;
    attesterAddress: string;
    claimHash: string;
    claimDescription: string | null;
    status: AttestationStatus;
    ledgerSequence: number;
    createdAt: Date;
  }[];
  disputes: {
    id: string;
    status: DisputeStatus;
    reason: string;
    reasonHash: string;
    submittedAt: Date;
    resolvedAt: Date | null;
    resolutionTxHash: string | null;
  }[];
  stellarTransaction: {
    hash: string;
    ledgerSequence: number;
    successful: boolean;
    sourceAddress: string;
  } | null;
}

export async function getFinancialEventDetail(
  businessId: string | null,
  eventId: string
): Promise<FinancialEventDetail | null> {
  if (!businessId) return null;

  const db = getDbClient();
  const event = await db.financialEvents.findById(eventId);
  if (!event || event.businessId !== businessId) return null;

  const [attestations, disputes, stellarTransaction] = await Promise.all([
    db.attestations.findByEvent(eventId),
    db.disputes.findAllByEventId(eventId),
    db.stellarTransactions.findByHash(event.stellarReference),
  ]);

  const { BETTER_AUTH_SECRET } = getServerEnv();
  // Unlike GET /api/activity/[eventId] (which fails the whole request 500 on
  // a decryption error), a page render degrades one dispute's reason to a
  // placeholder instead -- one undecryptable dispute shouldn't take down the
  // rest of the event's otherwise-readable detail page.
  const decryptedDisputes = disputes.map((dispute) => {
    let reason: string;
    try {
      reason = decryptDisputeReason(dispute.reasonPlaintext, BETTER_AUTH_SECRET);
    } catch (err) {
      if (err instanceof DisputeDecryptionError) {
        console.error({ operation: "decrypt-dispute", eventId, disputeId: dispute.id, error: err });
        reason = "(could not decrypt dispute reason)";
      } else {
        throw err;
      }
    }
    return {
      id: dispute.id,
      status: dispute.status,
      reason,
      reasonHash: dispute.reasonHash,
      submittedAt: dispute.submittedAt,
      resolvedAt: dispute.resolvedAt,
      resolutionTxHash: dispute.resolutionTxHash,
    };
  });

  return {
    event: {
      id: event.id,
      eventId: event.eventId,
      eventType: event.eventType,
      assetAddress: event.assetAddress,
      amount: event.amount,
      status: event.status,
      stellarReference: event.stellarReference,
      metadataHash: event.metadataHash,
      ledgerSequence: event.ledgerSequence,
      createdAt: event.createdAt,
      updatedAt: event.updatedAt,
    },
    attestations: attestations.map((a) => ({
      id: a.id,
      attestationId: a.attestationId,
      attesterAddress: a.attesterAddress,
      claimHash: a.claimHash,
      claimDescription: a.claimDescription,
      status: a.status,
      ledgerSequence: a.ledgerSequence,
      createdAt: a.createdAt,
    })),
    disputes: decryptedDisputes,
    stellarTransaction: stellarTransaction
      ? {
          hash: stellarTransaction.hash,
          ledgerSequence: stellarTransaction.ledgerSequence,
          successful: stellarTransaction.successful,
          sourceAddress: stellarTransaction.sourceAddress,
        }
      : null,
  };
}
