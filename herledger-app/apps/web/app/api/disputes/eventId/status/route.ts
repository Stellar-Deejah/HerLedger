import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

const ParamsSchema = z.object({
  eventId: z.string().min(1),
});

interface DisputeStatusResponse {
  data: {
    eventId: string;
    status: string;
    updatedAt: string;
  } | null;
  error: { code: string; message: string } | null;
}

const prisma = getPrismaClient();

export async function GET(
  req: NextRequest,
  { params }: { params: { eventId: string } }
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<DisputeStatusResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const parsed = ParamsSchema.safeParse(params);
  if (!parsed.success) {
    return typedJson<DisputeStatusResponse>(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid event ID" } },
      { status: 400 }
    );
  }

  const { eventId } = parsed.data;

  try {
    // Find the dispute by event ID
    const dispute = await prisma.dispute.findFirst({
      where: { eventId },
      include: {
        financialEvent: {
          select: {
            businessId: true,
          },
        },
      },
    });

    if (!dispute) {
      return typedJson<DisputeStatusResponse>(
        { data: null, error: { code: "NOT_FOUND", message: "Dispute not found" } },
        { status: 404 }
      );
    }

    // Verify the user owns this business
    const business = await prisma.businessProfile.findFirst({
      where: {
        businessId: dispute.financialEvent.businessId,
        userId: session.user.id,
      },
    });

    if (!business) {
      return typedJson<DisputeStatusResponse>(
        { data: null, error: { code: "FORBIDDEN", message: "Access denied" } },
        { status: 403 }
      );
    }

    return typedJson<DisputeStatusResponse>({
      data: {
        eventId: dispute.eventId,
        status: dispute.status,
        updatedAt: dispute.updatedAt.toISOString(),
      },
      error: null,
    });
  } catch (err) {
    console.error({ operation: "get-dispute-status", userId: session.user.id, error: err });
    return typedJson<DisputeStatusResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to fetch dispute status" } },
      { status: 500 }
    );
  }
}
