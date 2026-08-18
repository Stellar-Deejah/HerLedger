import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

const querySchema = z.object({
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = querySchema.safeParse({
    offset: searchParams.get("offset"),
    limit: searchParams.get("limit"),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_PARAMS", message: "Invalid pagination params" } },
      { status: 400 }
    );
  }

  const profile = await prisma.businessProfile.findFirst({
    where: { userId: session.user.id },
    select: { businessId: true },
  });

  if (!profile) {
    return NextResponse.json({ data: { events: [], pagination: { offset: 0, limit: parsed.data.limit, count: 0 } }, error: null });
  }

  const events = await prisma.financialEvent.findMany({
    where: { businessId: profile.businessId },
    orderBy: { ledgerSequence: "desc" },
    skip: parsed.data.offset,
    take: parsed.data.limit,
  });

  return NextResponse.json({
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
