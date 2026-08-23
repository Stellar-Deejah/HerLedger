import { getServerEnv } from "@herledger/config/server";
import { getDbClient } from "@herledger/db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { decryptDisputeReason, DisputeDecryptionError } from "@/lib/crypto/dispute-encryption";

import type { ActivityDetailResponse, DisputeDto } from "./schema";

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<ActivityDetailResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { eventId } = await context.params;
  if (!eventId) {
    return typedJson<ActivityDetailResponse>(
      { data: null, error: { code: "INVALID_PARAMS", message: "eventId is required" } },
      { status: 400 }
    );
  }

  try {
    const db = getDbClient();
    const profile = await db.businesses.findByUserId(session.user.id);
    if (!profile) {
      return typedJson<ActivityDetailResponse>(
        {
          data: null,
          error: { code: "NO_BUSINESS", message: "No business registered for this account" },
        },
        { status: 403 }
      );
    }

    const event = await db.financialEvents.findById(eventId);
    if (!event) {
      return typedJson<ActivityDetailResponse>(
        { data: null, error: { code: "NOT_FOUND", message: "Financial event not found" } },
        { status: 404 }
      );
    }
    if (event.businessId !== profile.businessId) {
      return typedJson<ActivityDetailResponse>(
        {
          data: null,
          error: { code: "FORBIDDEN", message: "You do not own this financial event" },
        },
        { status: 403 }
      );
    }

    const [attestations, disputes, stellarTransaction] = await Promise.all([
      db.attestations.findByEvent(eventId),
      db.disputes.findAllByEventId(eventId),
      db.stellarTransactions.findByHash(event.stellarReference),
    ]);

    const { BETTER_AUTH_SECRET } = getServerEnv();
    let decryptedDisputes: DisputeDto[];
    try {
      decryptedDisputes = disputes.map((dispute) => ({
        id: dispute.id,
        status: dispute.status,
        reason: decryptDisputeReason(dispute.reasonPlaintext, BETTER_AUTH_SECRET),
        reasonHash: dispute.reasonHash,
        submittedAt: dispute.submittedAt.toISOString(),
        resolvedAt: dispute.resolvedAt?.toISOString() ?? null,
        resolutionTxHash: dispute.resolutionTxHash,
      }));
    } catch (err) {
      if (err instanceof DisputeDecryptionError) {
        console.error({ operation: "decrypt-dispute", eventId, error: err });
        return typedJson<ActivityDetailResponse>(
          {
            data: null,
            error: { code: "DECRYPTION_FAILED", message: "Could not decrypt dispute reason" },
          },
          { status: 500 }
        );
      }
      throw err;
    }

    return typedJson<ActivityDetailResponse>({
      data: {
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
          createdAt: event.createdAt.toISOString(),
          updatedAt: event.updatedAt.toISOString(),
        },
        attestations: attestations.map((a) => ({
          id: a.id,
          attestationId: a.attestationId,
          attesterAddress: a.attesterAddress,
          claimHash: a.claimHash,
          claimDescription: a.claimDescription,
          status: a.status,
          ledgerSequence: a.ledgerSequence,
          createdAt: a.createdAt.toISOString(),
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
      },
      error: null,
    });
  } catch (err) {
    console.error({
      operation: "get-activity-detail",
      userId: session.user.id,
      eventId,
      error: err,
    });
    return typedJson<ActivityDetailResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to load financial event" } },
      { status: 500 }
    );
  }
}
