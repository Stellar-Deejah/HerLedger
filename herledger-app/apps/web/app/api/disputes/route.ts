import { getServerEnv } from "@herledger/config/server";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/lib/auth/server";
import { encryptDisputeReason } from "@/lib/crypto/dispute-encryption";
import { getPrismaClient } from "@/lib/db/client";

const prisma = getPrismaClient();

// `reasonHash` is a 32-byte hex digest (64 hex chars), matching the
// `reason_hash: BytesN<32>` argument submitted on-chain via dispute_event
// (see dispute-form.tsx's hashReason()). We store the exact value the
// client submitted on-chain rather than recomputing it server-side, so a
// user can always reproduce and compare it against the on-chain record.
const bodySchema = z.object({
  eventId: z.string().min(1).max(64),
  reason: z.string().min(1).max(2000),
  reasonHash: z
    .string()
    .length(64)
    .regex(/^[0-9a-f]{64}$/i, "reasonHash must be a 64-character hex string"),
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid dispute data" } },
      { status: 400 }
    );
  }

  const { eventId, reason, reasonHash } = parsed.data;

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
      select: { businessId: true },
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

    const { BETTER_AUTH_SECRET } = getServerEnv();
    const reasonPlaintext = encryptDisputeReason(reason, BETTER_AUTH_SECRET);

    const dispute = await prisma.dispute.create({
      data: {
        eventId,
        userId: session.user.id,
        reasonPlaintext,
        reasonHash,
        status: "Submitted",
      },
      select: { id: true },
    });

    // TODO(#51 follow-up): notify the event's attester(s), if any, that a
    // dispute has been raised. The NotificationPreference model that would
    // back an in-app/email notification pathway is being added in a
    // parallel PR against prisma/schema.prisma; wiring the actual send is
    // intentionally deferred until that model exists, to avoid coupling
    // this PR to a branch it cannot see. Attestation.status is still kept
    // eventually-consistent via the indexer's syncAttestation regardless.

    return NextResponse.json({ data: { id: dispute.id }, error: null });
  } catch (err) {
    console.error({ operation: "create-dispute", userId: session.user.id, error: err });
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to record dispute" } },
      { status: 500 }
    );
  }
}
