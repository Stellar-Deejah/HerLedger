import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db/client";
import { buildWalletLinkChallengeMessage, generateWalletLinkNonce } from "@herledger/sdk";

// ---------------------------------------------------------------------------
// POST /api/settings/wallet/challenge
// Issues a wallet-ownership challenge message for the caller to sign with
// Freighter, as the first step of re-linking (or initially linking) a
// wallet to their business profile. Stateless: the nonce and issuedAt are
// handed back to the client and re-submitted with the signature in
// PATCH /api/settings/wallet, which rebuilds and re-verifies the same
// message rather than looking up server-stored challenge state.
// ---------------------------------------------------------------------------

const bodySchema = z.object({
  walletAddress: z.string().min(56).max(56),
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
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid wallet address" } },
      { status: 400 }
    );
  }

  const business = await prisma.businessProfile.findUnique({
    where: { userId: session.user.id },
    select: { businessId: true },
  });
  if (!business) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "BUSINESS_NOT_FOUND", message: "No business profile for this account" },
      },
      { status: 404 }
    );
  }

  const nonce = generateWalletLinkNonce();
  const issuedAt = new Date().toISOString();
  const message = buildWalletLinkChallengeMessage({
    businessId: business.businessId,
    walletAddress: parsed.data.walletAddress,
    nonce,
    issuedAt,
  });

  return NextResponse.json({ data: { message, nonce, issuedAt }, error: null });
}
