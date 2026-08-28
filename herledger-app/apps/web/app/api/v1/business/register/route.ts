import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { writeLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

import { RequestSchema, type BusinessRegisterResponse } from "./schema";

const prisma = getPrismaClient();

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
    const existing = await prisma.businessProfile.findFirst({
      where: { userId: session.user.id },
    });
    if (existing) {
      return typedJson<BusinessRegisterResponse>(
        {
          data: null,
          error: {
            code: "ALREADY_REGISTERED",
            message: "Business already registered for this account",
          },
        },
        { status: 409 }
      );
    }

    const profile = await prisma.businessProfile.create({
      data: {
        userId: session.user.id,
        businessId,
        walletAddress,
        displayName,
        metadataHash,
        active: true,
      },
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
