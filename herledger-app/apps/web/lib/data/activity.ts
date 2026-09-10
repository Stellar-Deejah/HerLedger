import "server-only";

import { getDbClient } from "@herledger/db";
import { unstable_cache } from "next/cache";

import type { ActivityRecentData } from "@/app/api/activity/recent/schema";
import { toDateRange } from "@/lib/utils/date-range";

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
  {
    offset,
    limit,
    startDate,
    endDate,
  }: { offset: number; limit: number; startDate?: string; endDate?: string }
): Promise<ActivityRecentData> {
  const safeOffset = typeof offset === "number" && !Number.isNaN(offset) ? offset : 0;
  const safeLimit = typeof limit === "number" && !Number.isNaN(limit) ? limit : 20;

  if (!businessId) {
    return { events: [], pagination: { offset: safeOffset, limit: safeLimit, count: 0 } };
  }

  const fetchPageFn = async () => {
    const db = getDbClient();
    const events = await db.financialEvents.findRecentByBusiness(businessId, {
      offset: safeOffset,
      limit: safeLimit,
      ...toDateRange({
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      }),
    });
    return events.map((e) => ({
      id: e.id,
      eventId: e.eventId,
      eventType: e.eventType,
      assetAddress: e.assetAddress,
      amount: e.amount,
      status: e.status,
      stellarReference: e.stellarReference,
      ledgerSequence: e.ledgerSequence,
      createdAt: e.createdAt.toISOString(),
    }));
  };

  // startDate/endDate join the cache key alongside offset/limit -- a
  // different range is a genuinely different result set, not a cache hit
  // for the unfiltered one.
  const shouldSkipCache =
    process.env.NODE_ENV === "test" ||
    process.env.NODE_ENV === "development" ||
    Boolean(process.env.CI) ||
    Boolean(process.env.PLAYWRIGHT_TEST);

  const cacheKey = `activity-${businessId}-${safeOffset}-${safeLimit}-${startDate ?? ""}-${endDate ?? ""}`;
  const fetchPage = shouldSkipCache
    ? fetchPageFn
    : unstable_cache(fetchPageFn, [cacheKey], {
        revalidate: ACTIVITY_REVALIDATE_SECONDS,
      });

  const events = await fetchPage();

  return {
    events,
    pagination: { offset: safeOffset, limit: safeLimit, count: events.length },
  };
}
