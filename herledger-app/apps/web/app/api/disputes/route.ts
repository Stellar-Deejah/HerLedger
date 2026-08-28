import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { rateLimitKey } from "@/lib/api/rate-limit";
import { readLimiter } from "@/lib/api/rate-limit-config";
import { writeLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { requireBusinessOwner } from "@/lib/auth/require-business-owner";
import { encryptDisputeReason } from "@/lib/crypto/dispute-encryption";
import { getServerEnv } from "@herledger/config/server";
import { getPrismaClient } from "@/lib/db/client";

const QuerySchema = z.object({
  businessId: z.string().min(1),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(10),
});

const CreateSchema = z.object({
  eventId: z.string().min(1).max(64),
  reason: z.string().min(1).max(2000),
  reasonHash: z.string().length(64).regex(/^[0-9a-f]{64}$/i),
});

interface DisputesResponse {
  data: {
    disputes: Array<{
      id: string;
      eventId: string;
      reasonHash: string;
      status: string;
      createdAt: string;
      updatedAt: string;
    }>;
    total: number;
    offset: number;
    limit: number;
  } | null;
  error: { code: string; message: string } | null;
}

const prisma = getPrismaClient();

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = readLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;

  if (!session) {
    return typedJson<DisputesResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const searchParams = Object.fromEntries(req.nextUrl.searchParams);
  const parsed = QuerySchema.safeParse(searchParams);
  
  if (!parsed.success) {
    return typedJson<DisputesResponse>(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid query parameters" } },
      { status: 400 }
    );
  }

  const { businessId, offset, limit } = parsed.data;

  try {
    const ownership = await requireBusinessOwner(session, businessId);
    if (!ownership.ok) {
      return typedJson<DisputesResponse>(
        { data: null, error: { code: ownership.code, message: ownership.message } },
        { status: ownership.status }
      );
    }

    // Fetch disputes with pagination
    const [disputes, total] = await Promise.all([
      prisma.dispute.findMany({
        where: {
          event: {
            businessId,
          },
        },
        include: {
          event: {
            select: {
              id: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip: offset,
        take: limit,
      }),
      prisma.dispute.count({
        where: {
          event: {
            businessId,
          },
        },
      }),
    ]);

    return typedJson<DisputesResponse>({
      data: {
        disputes: disputes.map((d) => ({
          id: d.id,
          eventId: d.eventId,
          reasonHash: d.reasonHash,
          status: d.status,
          createdAt: d.createdAt.toISOString(),
          updatedAt: d.updatedAt.toISOString(),
        })),
        total,
        offset,
        limit,
      },
      error: null,
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  const limited = writeLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;
  if (!session) {
    return NextResponse.json({ data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } }, { status: 401 });
  }
  const parsed = CreateSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ data: null, error: { code: "VALIDATION_ERROR", message: "Invalid dispute data" } }, { status: 400 });
  }
  const event = await prisma.financialEvent.findUnique({
    where: { eventId: parsed.data.eventId }, select: { businessId: true },
  });
  if (!event) {
    return NextResponse.json({ data: null, error: { code: "NOT_FOUND", message: "Financial event not found" } }, { status: 404 });
  }
  const ownership = await requireBusinessOwner(session, event.businessId);
  if (!ownership.ok) {
    return NextResponse.json({ data: null, error: { code: ownership.code, message: ownership.message } }, { status: ownership.status });
  }
  try {
    const { BETTER_AUTH_SECRET } = getServerEnv();
    const dispute = await prisma.dispute.create({
      data: { eventId: parsed.data.eventId, userId: session.user.id,
        reasonPlaintext: encryptDisputeReason(parsed.data.reason, BETTER_AUTH_SECRET),
        reasonHash: parsed.data.reasonHash, status: "Submitted" }, select: { id: true },
    });
    return NextResponse.json({ data: { id: dispute.id }, error: null });
  } catch (err) {
    console.error({ operation: "create-dispute", userId: session.user.id, error: err });
    return NextResponse.json({ data: null, error: { code: "INTERNAL_ERROR", message: "Failed to record dispute" } }, { status: 500 });
  }
}
  } catch (err) {
    console.error({ operation: "list-disputes", userId: session.user.id, error: err });
    return typedJson<DisputesResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to fetch disputes" } },
      { status: 500 }
    );
  }
}
