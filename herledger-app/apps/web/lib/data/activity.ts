import "server-only";

import { unstable_cache } from "next/cache";

import type { ActivityRecentData } from "@/app/api/activity/recent/schema";
import { getPrismaClient } from "@/lib/db/client";

const prisma = getPrismaClient();

// ---------------------------------------------------------------------------
// Shared data-access for "recent financial activity", used by both the
// GET /api/activity/recent route handler (client-driven pagination beyond
// page 0, and the SSE-triggered refetch) and the RSC widgets that render the
// first page directly during SSR.
//
// Cached with a time-based TTL only, deliberately with no revalidation tag:
// FinancialEvent rows are written exclusively by the external indexer
// process (indexer/src/main.ts), which is not part of this Next.js app and
// can never call revalidateTag(). A tag here would have no caller. Freshness
// instead comes from the short TTL plus the existing client-side SSE stream
// (useEventStream) that overlays newly-indexed events after initial paint —
// the two mechanisms are independent and don't need to coordinate.
// ---------------------------------------------------------------------------

const ACTIVITY_REVALIDATE_SECONDS = 20;

export async function getRecentActivity(
  businessId: string | null,
  { offset, limit }: { offset: number; limit: number }
): Promise<ActivityRecentData> {
  if (!businessId) {
    return { events: [], pagination: { offset: 0, limit, count: 0 } };
  }

  const fetchPage = unstable_cache(
    async () => {
      const events = await prisma.financialEvent.findMany({
        where: { businessId },
        orderBy: { ledgerSequence: "desc" },
        skip: offset,
        take: limit,
        select: {
          id: true,
          eventId: true,
          eventType: true,
          assetAddress: true,
          amount: true,
          status: true,
          stellarReference: true,
          ledgerSequence: true,
        },
      });
      return events;
    },
    [`activity-${businessId}-${offset}-${limit}`],
    { revalidate: ACTIVITY_REVALIDATE_SECONDS }
  );

  const events = await fetchPage();

  return {
    events,
    pagination: { offset, limit, count: events.length },
  };
}
