import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

const QuerySchema = z.object({
  businessId: z.string().min(1),
  offset: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(50).default(10),
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
    // Verify business ownership
    const business = await prisma.businessProfile.findFirst({
      where: {
        businessId,
        userId: session.user.id,
      },
    });

    if (!business) {
      return typedJson<DisputesResponse>(
        { data: null, error: { code: "NOT_FOUND", message: "Business not found" } },
        { status: 404 }
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
  } catch (err) {
    console.error({ operation: "list-disputes", userId: session.user.id, error: err });
    return typedJson<DisputesResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to fetch disputes" } },
      { status: 500 }
    );
  }
}
