import { getDbClient } from "@herledger/db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { writeLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";

import { RequestSchema, type BusinessRegisterResponse } from "./schema";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = writeLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;

  if (!session) {
    return typedJson<BusinessRegisterResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return typedJson<BusinessRegisterResponse>(
      { data: null, error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return typedJson<BusinessRegisterResponse>(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid registration data" } },
      { status: 400 }
    );
  }

  const { businessId, walletAddress, displayName, metadataHash } = parsed.data;

  try {
    const db = getDbClient();
    const existingForUser = await db.businesses.findByUserId(session.user.id);
    if (existingForUser) {
      const isSameSubmission =
        existingForUser.businessId === businessId &&
        existingForUser.walletAddress === walletAddress &&
        existingForUser.metadataHash === metadataHash;

      if (isSameSubmission) {
        return typedJson<BusinessRegisterResponse>({
          data: { businessId: existingForUser.businessId },
          error: null,
        });
      }

      return typedJson<BusinessRegisterResponse>(
        {
          data: null,
          error: {
            code: "ALREADY_REGISTERED",
            message: `Business already registered for this account (businessId: ${existingForUser.businessId})`,
          },
        },
        { status: 409 }
      );
    }

    const existingWallet = await db.businesses.findByWallet(walletAddress);
    if (existingWallet) {
      return typedJson<BusinessRegisterResponse>(
        {
          data: null,
          error: {
            code: "WALLET_ALREADY_REGISTERED",
            message: `This wallet is already registered (businessId: ${existingWallet.businessId})`,
          },
        },
        { status: 409 }
      );
    }

    const existingBusinessId = await db.businesses.findById(businessId);
    if (existingBusinessId) {
      return typedJson<BusinessRegisterResponse>(
        {
          data: null,
          error: {
            code: "BUSINESS_ID_CONFLICT",
            message: `businessId already registered (businessId: ${existingBusinessId.businessId})`,
          },
        },
        { status: 409 }
      );
    }

    const profile = await db.businesses.create({
      userId: session.user.id,
      businessId,
      walletAddress,
      displayName,
      metadataHash,
      active: true,
    });

    return typedJson<BusinessRegisterResponse>({
      data: { businessId: profile.businessId },
      error: null,
    });
  } catch (err) {
    console.error({ operation: "register-business", userId: session.user.id, error: err });
    return typedJson<BusinessRegisterResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Registration failed" } },
      { status: 500 }
    );
  }
}
