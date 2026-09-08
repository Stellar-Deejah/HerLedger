import "server-only";

import { unstable_cache } from "next/cache";

import type { ActivitySummaryData } from "@/app/api/v1/activity/summary/schema";
import { toDateRange } from "@/lib/utils/date-range";
import { getDbClient } from "@herledger/db";

// ---------------------------------------------------------------------------
// Shared data-access for the financial KPI summary (total received, total
// sent, net balance, count by status). Same caching rationale as
// lib/data/activity.ts's getRecentActivity: short TTL, no revalidation tag,
// since FinancialEvent rows are only ever written by the external indexer
// process.
// ---------------------------------------------------------------------------

const SUMMARY_REVALIDATE_SECONDS = 20;

const EMPTY_SUMMARY: ActivitySummaryData = {
  totalReceived: "0",
  totalSent: "0",
  netBalance: "0",
  countByStatus: { Pending: 0, Verified: 0, Disputed: 0, Revoked: 0 },
};

export async function getActivitySummary(
  businessId: string | null,
  { startDate, endDate }: { startDate?: string; endDate?: string } = {}
): Promise<ActivitySummaryData> {
  if (!businessId) {
    return EMPTY_SUMMARY;
  }

  const fetchSummaryFn = () => {
    const db = getDbClient();
    return db.financialEvents.summarize(
      businessId,
      toDateRange({
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      })
    );
  };

  const cacheKey = `activity-summary-${businessId}-${startDate ?? ""}-${endDate ?? ""}`;
  const fetchSummary =
    process.env.NODE_ENV === "test"
      ? fetchSummaryFn
      : unstable_cache(fetchSummaryFn, [cacheKey], {
          revalidate: SUMMARY_REVALIDATE_SECONDS,
        });

  return fetchSummary();
}
