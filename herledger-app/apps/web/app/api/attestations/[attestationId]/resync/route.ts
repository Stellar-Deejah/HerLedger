import { getDbClient } from "@herledger/db";
import { getAttestation } from "@herledger/sdk";
import { revalidateTag } from "next/cache";
import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { writeLimiter } from "@/lib/api/rate-limit-config";
import { auth } from "@/lib/auth/server";
import { attestationsTag } from "@/lib/data/attestations";
import { getServerStellarConfig, getServerContractConfig } from "@/lib/stellar/server-config";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ attestationId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = writeLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;

  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { attestationId } = await context.params;

  const db = getDbClient();
  const profile = await db.businesses.findByUserId(session.user.id);
  if (!profile) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "Attestation not found" } },
      { status: 404 }
    );
  }

  const existing = await db.attestations.findByAttestationIdAndBusiness(
    attestationId,
    profile.businessId
  );
  if (!existing) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "Attestation not found" } },
      { status: 404 }
    );
  }

  const onChain = await getAttestation(
    attestationId,
    getServerStellarConfig(),
    getServerContractConfig()
  );
  if (!onChain) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "Attestation not found on-chain" } },
      { status: 404 }
    );
  }

  const updated = await db.attestations.upsert({
    attestationId,
    eventId: existing.eventId,
    attesterAddress: existing.attesterAddress,
    claimHash: existing.claimHash,
    status: onChain.status,
    ledgerSequence: existing.ledgerSequence,
  });

  revalidateTag(attestationsTag(profile.businessId), "max");

  return NextResponse.json({ data: { attestation: updated }, error: null });
}
