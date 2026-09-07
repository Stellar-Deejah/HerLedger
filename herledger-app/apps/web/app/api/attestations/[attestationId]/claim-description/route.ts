import { getDbClient } from "@herledger/db";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { writeLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { attestationsTag } from "@/lib/data/attestations";

import { RequestSchema, type ClaimDescriptionResponse } from "./schema";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ attestationId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = writeLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;

  if (!session) {
    return typedJson<ClaimDescriptionResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { attestationId } = await context.params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return typedJson<ClaimDescriptionResponse>(
      { data: null, error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return typedJson<ClaimDescriptionResponse>(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid claim data" } },
      { status: 400 }
    );
  }

  const { eventId, attesterAddress, claimHash, claimDescription, ledgerSequence } = parsed.data;

  const db = getDbClient();
  const attester = await db.attesters.findByWallet(attesterAddress);
  if (!attester?.active) {
    return typedJson<ClaimDescriptionResponse>(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Wallet is not a registered attester" },
      },
      { status: 403 }
    );
  }

  try {
    const attestation = await db.attestations.upsertClaimDescription({
      attestationId,
      eventId,
      attesterAddress,
      claimHash,
      claimDescription,
      ledgerSequence,
    });

    const event = await db.financialEvents.findById(eventId);
    if (event) {
      revalidateTag(attestationsTag(event.businessId), "max");
    }

    return typedJson<ClaimDescriptionResponse>({
      data: { attestationId: attestation.attestationId },
      error: null,
    });
  } catch (err) {
    console.error({
      operation: "store-claim-description",
      userId: session.user.id,
      attestationId,
      error: err,
    });
    return typedJson<ClaimDescriptionResponse>(
      {
        data: null,
        error: { code: "INTERNAL_ERROR", message: "Failed to save claim description" },
      },
      { status: 500 }
    );
  }
}
