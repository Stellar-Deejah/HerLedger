import { getServerEnv } from "@herledger/config/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";
import { decryptDisputeReason, DisputeDecryptionError } from "@/lib/crypto/dispute-encryption";
import { deriveDisputeLifecycleStatus } from "@/lib/disputes/status";
import { getDbClient } from "@herledger/db";

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { eventId } = await context.params;
  if (!eventId) {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_PARAMS", message: "eventId is required" } },
      { status: 400 }
    );
  }

  try {
    const db = getDbClient();
    const profile = await db.businesses.findByUserId(session.user.id);
    if (!profile) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "NO_BUSINESS", message: "No business registered for this account" },
        },
        { status: 403 }
      );
    }

    const event = await db.financialEvents.findById(eventId);
    if (!event) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "Financial event not found" } },
        { status: 404 }
      );
    }
    if (event.businessId !== profile.businessId) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "FORBIDDEN", message: "You do not own this financial event" },
        },
        { status: 403 }
      );
    }

    const dispute = await db.disputes.findByEventId(eventId);
    if (!dispute) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "No dispute found for this event" } },
        { status: 404 }
      );
    }

    if (dispute.userId !== session.user.id) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "FORBIDDEN", message: "You do not own this dispute" },
        },
        { status: 403 }
      );
    }

    const derivedStatus = deriveDisputeLifecycleStatus(event.status, dispute.status);
    if (derivedStatus !== dispute.status) {
      const resolvedAt = dispute.resolvedAt ?? new Date();
      await db.prisma.dispute.update({
        where: { id: dispute.id },
        data: { status: derivedStatus, resolvedAt },
      });
      dispute.status = derivedStatus;
      dispute.resolvedAt = resolvedAt;
    }

    const { BETTER_AUTH_SECRET } = getServerEnv();
    let reasonPlaintext: string;
    try {
      reasonPlaintext = decryptDisputeReason(dispute.reasonPlaintext, BETTER_AUTH_SECRET);
    } catch (err) {
      if (err instanceof DisputeDecryptionError) {
        console.error({ operation: "decrypt-dispute", disputeId: dispute.id, error: err });
        return NextResponse.json(
          {
            data: null,
            error: { code: "DECRYPTION_FAILED", message: "Could not decrypt dispute reason" },
          },
          { status: 500 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      data: {
        dispute: {
          id: dispute.id,
          eventId: dispute.eventId,
          status: dispute.status,
          reasonPlaintext,
          reasonHash: dispute.reasonHash,
          submittedAt: dispute.submittedAt,
          resolvedAt: dispute.resolvedAt,
          resolutionTxHash: dispute.resolutionTxHash,
        },
      },
      error: null,
    });
  } catch (err) {
    console.error({ operation: "get-dispute", userId: session.user.id, eventId, error: err });
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to load dispute" } },
      { status: 500 }
    );
  }
}
