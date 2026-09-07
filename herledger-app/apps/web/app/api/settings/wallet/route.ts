import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";
import {
  ActiveDisputeError,
  hasActiveDisputes,
  relinkBusinessWallet,
  unlinkBusinessWallet,
} from "@/lib/settings/wallet";
import {
  buildWalletLinkChallengeMessage,
  isWalletLinkChallengeExpired,
  verifyWalletLinkChallengeSignature,
} from "@herledger/sdk";

const prisma = getPrismaClient();

// ---------------------------------------------------------------------------
// PATCH /api/settings/wallet — re-link (or initially link) a wallet, proven
//   by a Freighter-signed ownership challenge (see .../wallet/challenge).
// DELETE /api/settings/wallet — unlink the current wallet.
//
// Both are blocked (409) while the business has an active dispute — see
// apps/web/lib/settings/wallet.ts for why.
// ---------------------------------------------------------------------------

const patchBodySchema = z.object({
  walletAddress: z.string().min(56).max(56),
  nonce: z.string().min(1),
  issuedAt: z.string().min(1),
  signature: z.string().min(1),
});

function isPrismaKnownRequestError(err: unknown): err is { code: string } {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as { code: unknown }).code === "string"
  );
}

async function getSessionAndBusiness() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return { session: null, business: null } as const;

  const business = await prisma.businessProfile.findUnique({
    where: { userId: session.user.id },
    select: { businessId: true, walletAddress: true },
  });
  return { session, business } as const;
}

export async function GET() {
  const { session, business } = await getSessionAndBusiness();
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }
  if (!business) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "BUSINESS_NOT_FOUND", message: "No business profile for this account" },
      },
      { status: 404 }
    );
  }

  const activeDispute = await hasActiveDisputes(prisma, business.businessId);
  return NextResponse.json({
    data: {
      businessId: business.businessId,
      walletAddress: business.walletAddress,
      hasActiveDispute: activeDispute,
    },
    error: null,
  });
}

export async function PATCH(req: NextRequest) {
  const { session, business } = await getSessionAndBusiness();
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }
  if (!business) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "BUSINESS_NOT_FOUND", message: "No business profile for this account" },
      },
      { status: 404 }
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

  const parsed = patchBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid re-link request" } },
      { status: 400 }
    );
  }
  const { walletAddress, nonce, issuedAt, signature } = parsed.data;

  if (isWalletLinkChallengeExpired(issuedAt)) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "CHALLENGE_EXPIRED",
          message: "Verification challenge expired. Request a new one.",
        },
      },
      { status: 400 }
    );
  }

  const message = buildWalletLinkChallengeMessage({
    businessId: business.businessId,
    walletAddress,
    nonce,
    issuedAt,
  });

  if (!verifyWalletLinkChallengeSignature(message, signature, walletAddress)) {
    return NextResponse.json(
      {
        data: null,
        error: {
          code: "INVALID_SIGNATURE",
          message: "Wallet ownership signature verification failed",
        },
      },
      { status: 401 }
    );
  }

  try {
    const updated = await relinkBusinessWallet(prisma, business.businessId, walletAddress);
    return NextResponse.json({ data: { walletAddress: updated.walletAddress }, error: null });
  } catch (err) {
    if (err instanceof ActiveDisputeError) {
      return NextResponse.json(
        { data: null, error: { code: "ACTIVE_DISPUTE", message: err.message } },
        { status: 409 }
      );
    }
    // Duck-typed rather than `instanceof Prisma.PrismaClientKnownRequestError`:
    // Prisma error classes don't always narrow reliably via instanceof across
    // module/bundling boundaries, and every PrismaClientKnownRequestError
    // carries a string `code` regardless.
    if (isPrismaKnownRequestError(err) && err.code === "P2002") {
      return NextResponse.json(
        {
          data: null,
          error: {
            code: "WALLET_ALREADY_LINKED",
            message: "This wallet is already linked to another business",
          },
        },
        { status: 409 }
      );
    }
    console.error({ operation: "relink-wallet", userId: session.user.id, error: err });
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to re-link wallet" } },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const { session, business } = await getSessionAndBusiness();
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }
  if (!business) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "BUSINESS_NOT_FOUND", message: "No business profile for this account" },
      },
      { status: 404 }
    );
  }

  try {
    await unlinkBusinessWallet(prisma, business.businessId);
    return NextResponse.json({ data: { walletAddress: null }, error: null });
  } catch (err) {
    if (err instanceof ActiveDisputeError) {
      return NextResponse.json(
        { data: null, error: { code: "ACTIVE_DISPUTE", message: err.message } },
        { status: 409 }
      );
    }
    console.error({ operation: "unlink-wallet", userId: session.user.id, error: err });
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to unlink wallet" } },
      { status: 500 }
    );
  }
}
