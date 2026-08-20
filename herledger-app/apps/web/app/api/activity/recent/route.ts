import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getRecentActivity } from "@/lib/data/activity";
import { getPrismaClient } from "@/lib/db/client";

import { RequestSchema, type ActivityRecentResponse } from "./schema";

const prisma = getPrismaClient();

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
    offset: searchParams.get("offset"),
    limit: searchParams.get("limit"),
  });
  if (!parsed.success) {
    return typedJson<ActivityRecentResponse>(
      { data: null, error: { code: "INVALID_PARAMS", message: "Invalid pagination params" } },
      { status: 400 }
    );
  }

  const profile = await prisma.businessProfile.findFirst({
    where: { userId: session.user.id },
    select: { businessId: true },
  });

  const data = await getRecentActivity(profile?.businessId ?? null, {
    offset: parsed.data.offset,
    limit: parsed.data.limit,
  });

  return typedJson<ActivityRecentResponse>({ data, error: null });
}
