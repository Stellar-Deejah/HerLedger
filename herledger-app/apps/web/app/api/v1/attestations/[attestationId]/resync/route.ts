import { NextRequest, NextResponse } from "next/server";
import { getAttestation } from "@herledger/sdk";
import { auth } from "@/lib/auth/server";
import { headers } from "next/headers";
import { getServerStellarConfig, getServerContractConfig } from "@/lib/stellar/server-config";
import { getPrismaClient } from "@/lib/db/client";

const prisma = getPrismaClient();

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

  const profile = await prisma.businessProfile.findFirst({
    where: { userId: session.user.id },
    select: { businessId: true },
  });
  if (!profile) {
    return NextResponse.json(
      { data: null, error: { code: "NOT_FOUND", message: "Attestation not found" } },
      { status: 404 }
    );
  }

  const existing = await prisma.attestation.findFirst({
    where: {
      attestationId,
      event: { businessId: profile.businessId },
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
    data: { status: onChain.status },
  });

  return NextResponse.json({ data: { attestation: updated }, error: null });
}
