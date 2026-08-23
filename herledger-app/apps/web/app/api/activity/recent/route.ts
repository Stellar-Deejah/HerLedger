import { getDbClient } from "@herledger/db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getRecentActivity } from "@/lib/data/activity";

import { RequestSchema, type ActivityRecentResponse } from "./schema";

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<ActivityRecentResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = RequestSchema.safeParse({
    offset: searchParams.get("offset") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return typedJson<ActivityRecentResponse>(
      { data: null, error: { code: "INVALID_PARAMS", message: "Invalid pagination params" } },
      { status: 400 }
    );
  }

  const db = getDbClient();
  const profile = await db.businesses.findByUserId(session.user.id);

  const data = await getRecentActivity(profile?.businessId ?? null, {
    offset: parsed.data.offset,
    limit: parsed.data.limit,
  });

  return typedJson<ActivityRecentResponse>({ data, error: null });
}
