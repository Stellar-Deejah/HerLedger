import { getServerEnv } from "@herledger/config/server";
import { getDbClient } from "@herledger/db";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { readLimiter } from "@/lib/api/rate-limit-config";
import { auth } from "@/lib/auth/server";
import { decryptDisputeReason, DisputeDecryptionError } from "@/lib/crypto/dispute-encryption";
import { deriveDisputeLifecycleStatus } from "@/lib/disputes/status";

const ParamsSchema = z.object({
  eventId: z.string().min(1, "eventId is required"),
});

interface RouteContext {
  params: Promise<{ eventId: string }>;
}

export async function GET(_req: NextRequest, context: RouteContext) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = readLimiter.check(rateLimitKey(_req, session?.user?.id));
  if (limited) return limited;

  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { eventId } = await context.params;
  const parsed = ParamsSchema.safeParse({ eventId });
  if (!parsed.success) {
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

    const event = await db.financialEvents.findById(parsed.data.eventId);
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

    const dispute = await db.disputes.findByEventId(parsed.data.eventId);
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
    console.error({ operation: "get-dispute", userId: session.user.id, eventId: parsed.data.eventId, error: err });
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to load dispute" } },
      { status: 500 }
    );
  }
}
