import { getDbClient } from "@herledger/db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { writeLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";

import { RequestSchema, type AttesterRegisterResponse } from "./schema";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = writeLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;

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
    const db = getDbClient();
    const profile = await db.attesters.upsert({
      walletAddress,
      displayName,
      description: description ?? null,
      active: true,
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
