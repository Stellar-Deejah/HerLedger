import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
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

  if (!profile) {
    return typedJson<ActivityRecentResponse>({
      data: { events: [], pagination: { offset: 0, limit: parsed.data.limit, count: 0 } },
      error: null,
    });
  }

  const events = await prisma.financialEvent.findMany({
    where: { businessId: profile.businessId },
    orderBy: { ledgerSequence: "desc" },
    skip: parsed.data.offset,
    take: parsed.data.limit,
  });

  return typedJson<ActivityRecentResponse>({
    data: {
      events: events.map((e) => ({
        id: e.id,
        eventId: e.eventId,
        eventType: e.eventType,
        assetAddress: e.assetAddress,
        amount: e.amount,
        status: e.status,
        stellarReference: e.stellarReference,
        ledgerSequence: e.ledgerSequence,
        createdAt: e.createdAt.toISOString(),
      })),
      pagination: {
        offset: parsed.data.offset,
        limit: parsed.data.limit,
        count: events.length,
      },
    },
    error: null,
  });
}
