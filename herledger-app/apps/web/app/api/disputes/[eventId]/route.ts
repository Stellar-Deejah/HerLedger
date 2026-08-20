import { getServerEnv } from "@herledger/config/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";
import { decryptDisputeReason, DisputeDecryptionError } from "@/lib/crypto/dispute-encryption";
import { getPrismaClient } from "@/lib/db/client";
import { deriveDisputeLifecycleStatus } from "@/lib/disputes/status";

const prisma = getPrismaClient();

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

/**
 * GET /api/disputes/:eventId
 *
 * Returns the most recent dispute raised against a financial event, with
 * `reasonPlaintext` decrypted -- but ONLY when the caller is the business
 * owner who raised it. This is an access-control decision, not just a
 * field-redaction one: an unauthenticated caller, a different HerLedger
 * user, or even the event's attester get a 403 with no dispute data at
 * all, rather than a version of the response with the reason stripped out.
 * A dispute reason can contain sensitive business/financial detail, and the
 * only party with a legitimate need to read it back (as opposed to just
 * seeing that a dispute exists and its lifecycle status, which is already
 * visible via /api/activity/recent's EventStatus) is the business that
 * filed it.
 */
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
    const profile = await prisma.businessProfile.findFirst({
      where: { userId: session.user.id },
      select: { businessId: true },
    });
    if (!profile) {
      return NextResponse.json(
        {
          data: null,
          error: { code: "NO_BUSINESS", message: "No business registered for this account" },
        },
        { status: 403 }
      );
    }

    const event = await prisma.financialEvent.findUnique({
      where: { eventId },
      select: { businessId: true, status: true },
    });
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

    const dispute = await prisma.dispute.findFirst({
      where: { eventId },
      orderBy: { submittedAt: "desc" },
    });
    if (!dispute) {
      return NextResponse.json(
        { data: null, error: { code: "NOT_FOUND", message: "No dispute found for this event" } },
        { status: 404 }
      );
    }

    // Ownership double-check: the dispute must have been filed by this
    // session's user, not merely by someone at the same business (a
    // BusinessProfile is 1:1 with a User in the current schema, so these
    // should always agree -- this is defense in depth, not a workaround).
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
      // Self-heal: the on-chain event has moved past what this dispute
      // record reflects (e.g. resolve_dispute/revoke_event landed since we
      // last wrote this row). No indexer job wires this automatically yet
      // (see prisma/schema.prisma Dispute.resolutionTxHash comment), so we
      // reconcile lazily on read instead of leaving stale data in front of
      // the user.
      const resolvedAt = dispute.resolvedAt ?? new Date();
      await prisma.dispute.update({
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
