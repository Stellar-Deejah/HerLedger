import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { attestationsTag } from "@/lib/data/attestations";
import { getPrismaClient } from "@/lib/db/client";

import { RequestSchema, type ClaimDescriptionResponse } from "./schema";

const prisma = getPrismaClient();

/**
 * Store the human-readable claim text for a just-created attestation.
 *
 * Called by CreateAttestationForm immediately after create_attestation
 * confirms on-chain. The Attestation row may not exist yet at that point --
 * the indexer's own sync job (indexer/src/index/attestations.ts) is what
 * normally creates it, and that can lag behind a fresh on-chain write -- so
 * this route upserts the row itself using the same fields the client just
 * used to build the transaction, with `ledgerSequence` taken from the
 * confirmed transaction result.
 *
 * On the update path (row already exists, e.g. the indexer won the race)
 * this ONLY ever sets `claimDescription`, mirroring the indexer's own
 * upsertAttestation, which only ever sets `status` on update -- each side
 * owns a disjoint set of fields so neither can clobber the other.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attestationId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<ClaimDescriptionResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { attestationId } = await params;

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

  const attester = await prisma.attesterProfile.findUnique({
    where: { walletAddress: attesterAddress },
    select: { active: true },
  });
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
    const attestation = await prisma.attestation.upsert({
      where: { attestationId },
      create: {
        attestationId,
        eventId,
        attesterAddress,
        claimHash,
        status: "Active",
        ledgerSequence,
        claimDescription,
      },
      update: { claimDescription },
      select: { attestationId: true },
    });

    const event = await prisma.financialEvent.findUnique({
      where: { eventId },
      select: { businessId: true },
    });
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
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to save claim description" } },
      { status: 500 }
    );
  }
}
