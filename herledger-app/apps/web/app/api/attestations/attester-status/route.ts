import { getDbClient } from "@herledger/db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { readLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";

import { RequestSchema, type AttesterStatusResponse } from "./schema";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = readLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;

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

  const db = getDbClient();
  const profile = await db.attesters.findByWallet(parsed.data.walletAddress);

  return typedJson<AttesterStatusResponse>({
    data: {
      isAttester: profile?.active ?? false,
      displayName: profile?.active ? profile.displayName : null,
    },
    error: null,
  });
}
