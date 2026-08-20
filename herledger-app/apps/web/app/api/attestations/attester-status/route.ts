import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

import { RequestSchema, type AttesterStatusResponse } from "./schema";

const prisma = getPrismaClient();

// Attester role detection: does the given connected wallet belong to an
// active, registered attester? Backs CreateAttestationForm's visibility
// guard (see components/attestations/create-attestation-form.tsx) -- the
// form itself is gated on this, on top of the on-chain
// InvalidAttester/InactiveAttester checks create_attestation already
// enforces, so a non-attester wallet never even sees the form instead of
// only failing after a wallet-signature prompt.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<AttesterStatusResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = RequestSchema.safeParse({
    walletAddress: searchParams.get("walletAddress") ?? undefined,
  });
  if (!parsed.success) {
    return typedJson<AttesterStatusResponse>(
      { data: null, error: { code: "INVALID_PARAMS", message: "Invalid wallet address" } },
      { status: 400 }
    );
  }

  const profile = await prisma.attesterProfile.findUnique({
    where: { walletAddress: parsed.data.walletAddress },
    select: { displayName: true, active: true },
  });

  return typedJson<AttesterStatusResponse>({
    data: {
      isAttester: profile?.active ?? false,
      displayName: profile?.active ? profile.displayName : null,
    },
    error: null,
  });
}
