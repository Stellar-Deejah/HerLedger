import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";
import { requireBusinessOwner } from "@/lib/auth/require-business-owner";

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

  const ownership = await requireBusinessOwner(session);
  if (!ownership.ok) {
    return typedJson<ActivityRecentResponse>(
      { data: null, error: { code: ownership.code, message: ownership.message } },
      { status: ownership.status }
    );
  }

  const events = await prisma.financialEvent.findMany({
    where: { businessId: ownership.businessId },
    orderBy: { ledgerSequence: "desc" },
    skip: parsed.data.offset,
    take: parsed.data.limit,
  });

  return typedJson<ActivityRecentResponse>({
    data: {
      events,
      pagination: {
        offset: parsed.data.offset,
        limit: parsed.data.limit,
        count: events.length,
      },
    },
    error: null,
  });
}
