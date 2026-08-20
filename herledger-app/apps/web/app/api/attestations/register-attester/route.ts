import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

import { RequestSchema, type AttesterRegisterResponse } from "./schema";

const prisma = getPrismaClient();

// Persists the off-chain AttesterRegistry profile (display name +
// description) after AttesterRegistrationForm has already completed the
// on-chain register_attester call. Any authenticated HerLedger user may
// call this -- the same trust model as POST /api/business/register and
// POST /api/disputes: the real access control lives on-chain
// (register_attester requires the protocol admin's signature; the tx
// simply fails for anyone else, so a spoofed `txHash` with no matching
// successful admin-signed transaction never happens through the UI). The
// attester being registered is not required to have a HerLedger account of
// their own -- see AttesterProfile in prisma/schema.prisma.
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<AttesterRegisterResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return typedJson<AttesterRegisterResponse>(
      { data: null, error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return typedJson<AttesterRegisterResponse>(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid attester data" } },
      { status: 400 }
    );
  }

  const { walletAddress, displayName, description, metadataHash } = parsed.data;

  try {
    // Upsert rather than create-only: this also covers re-registering a
    // previously deactivated attester (deactivate_attester preserves
    // history on-chain; register_attester allows re-registering an
    // inactive attester -- see AlreadyExists only firing when `active`).
    const profile = await prisma.attesterProfile.upsert({
      where: { walletAddress },
      create: { walletAddress, displayName, description: description ?? null, active: true },
      update: { displayName, description: description ?? null, active: true },
    });

    return typedJson<AttesterRegisterResponse>({
      data: { walletAddress: profile.walletAddress },
      error: null,
    });
  } catch (err) {
    console.error({
      operation: "register-attester",
      userId: session.user.id,
      walletAddress,
      metadataHash,
      error: err,
    });
    return typedJson<AttesterRegisterResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Registration failed" } },
      { status: 500 }
    );
  }
}
