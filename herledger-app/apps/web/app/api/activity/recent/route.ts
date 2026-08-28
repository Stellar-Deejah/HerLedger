import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { readLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { requireBusinessOwner } from "@/lib/auth/require-business-owner";
import { getRecentActivity } from "@/lib/data/activity";
import { withRateLimit } from "@/lib/rate-limit";

import { RequestSchema, type ActivityRecentResponse } from "./schema";

export const GET = withRateLimit(async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = readLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;

  if (!session) {
    return typedJson<ActivityRecentResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" },
          meta: null
        },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = RequestSchema.safeParse({
    offset: searchParams.get("offset") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
  });
  if (!parsed.success) {
    return typedJson<ActivityRecentResponse>(
      { data: null, error: { code: "INVALID_PARAMS", message: "Invalid pagination params" },
          meta: null
        },
      { status: 422 }
    );
  }

  const ownership = await requireBusinessOwner(session);
  if (!ownership.ok) {
    return typedJson<ActivityRecentResponse>(
      { data: null, error: { code: ownership.code, message: ownership.message }, meta: null },
      { status: ownership.status }
    );
  }

  const data = await getRecentActivity(ownership.businessId, {
    offset: parsed.data.offset,
    limit: parsed.data.limit,
    ...(parsed.data.startDate ? { startDate: parsed.data.startDate } : {}),
    ...(parsed.data.endDate ? { endDate: parsed.data.endDate } : {}),
  });

  return typedJson<ActivityRecentResponse>({ data, error: null, meta: null });
});
