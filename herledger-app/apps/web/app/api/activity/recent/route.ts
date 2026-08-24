import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getRecentActivity } from "@/lib/data/activity";
import { getDbClient } from "@herledger/db";

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
    startDate: searchParams.get("startDate") ?? undefined,
    endDate: searchParams.get("endDate") ?? undefined,
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
    ...(parsed.data.startDate ? { startDate: parsed.data.startDate } : {}),
    ...(parsed.data.endDate ? { endDate: parsed.data.endDate } : {}),
  });

  return typedJson<ActivityRecentResponse>({ data, error: null });
}
