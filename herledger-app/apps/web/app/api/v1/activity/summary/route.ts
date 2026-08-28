import { getDbClient } from "@herledger/db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { readLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getActivitySummary } from "@/lib/data/activity-summary";

import { RequestSchema, type ActivitySummaryResponse } from "./schema";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = readLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;

  if (!session) {
    return typedJson<ActivitySummaryResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = RequestSchema.safeParse({
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
  });
  if (!parsed.success) {
    return typedJson<ActivitySummaryResponse>(
      { data: null, error: { code: "INVALID_PARAMS", message: "Invalid date range params" } },
      { status: 400 }
    );
  }

  const db = getDbClient();
  const profile = await db.businesses.findByUserId(session.user.id);

  const data = await getActivitySummary(profile?.businessId ?? null, {
    ...(parsed.data.startDate ? { startDate: parsed.data.startDate } : {}),
    ...(parsed.data.endDate ? { endDate: parsed.data.endDate } : {}),
  });

  return typedJson<ActivitySummaryResponse>({ data, error: null });
}
