import { NextRequest, NextResponse } from "next/server";
import { getAttestation } from "@herledger/sdk";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { getServerStellarConfig, getServerContractConfig } from "@/lib/stellar/server-config";
import { getPrismaClient } from "@/lib/db/client";
import { requireBusinessOwner } from "@/lib/auth/require-business-owner";

const prisma = getPrismaClient();

/**
 * Re-fetch one attestation's on-chain state and reconcile the DB row.
 *
 * Called on-demand by `AttestationList` when a client-side
 * `isValidAttestation` check disagrees with the DB-indexed status (see
 * apps/web/components/attestations/attestation-list.tsx for the trade-off
 * discussion: on-demand here vs. a background re-validation job). Mirrors
 * indexer's `syncAttestation` (indexer/src/index/attestations.ts) — indexer
 * isn't a dependency of apps/web, so this re-implements the same "only
 * status can change" upsert rule directly against apps/web's own Prisma
 * client rather than importing indexer internals across app boundaries.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ attestationId: string }> }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { attestationId } = await params;

  const ownership = await requireBusinessOwner(session);
  if (!ownership.ok) {
    return NextResponse.json(
      { data: null, error: { code: ownership.code, message: ownership.message } },
      { status: ownership.status }
    );
  }

  // Ownership check: only allow resyncing attestations attached to one of
  // this business's own events — prevents an authenticated user from
  // triggering resyncs (and RPC calls) for attestations that aren't theirs.
  const existing = await prisma.attestation.findFirst({
    where: {
      attestationId,
      event: { businessId: ownership.businessId },
    },
  });
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

  const updated = await prisma.attestation.update({
    where: { attestationId },
    // Only status can change — never overwrite blockchain-derived fields
    // (mirrors indexer/src/db/schema/attestations.ts's upsertAttestation).
    data: { status: onChain.status },
  });

  return NextResponse.json({ data: { attestation: updated }, error: null });
}
