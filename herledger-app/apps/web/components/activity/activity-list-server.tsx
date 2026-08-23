import { getRecentActivity } from "@/lib/data/activity";

import { ActivityList } from "./activity-list";
import { PAGE_SIZE } from "./constants";

interface ActivityListServerProps {
  businessId: string | null;
}

/**
 * Server Component: fetches the first page of activity during SSR so
 * ActivityList (client) can render it immediately instead of fetching on
 * mount. Pagination beyond page 0 still goes through the client's existing
 * GET /api/activity/recent call, which now reads through the same cached
 * lib/data/activity.getRecentActivity used here.
 */
export async function ActivityListServer({ businessId }: ActivityListServerProps) {
  let data: Awaited<ReturnType<typeof getRecentActivity>> | null = null;
  try {
    data = await getRecentActivity(businessId, { offset: 0, limit: PAGE_SIZE });
  } catch {
    data = null;
  }

  if (!data) {
    return (
      <div role="alert" style={{ color: "var(--danger)" }}>
        Could not load activity. Please try again.
      </div>
    );
  }

  return (
    <ActivityList initialEvents={data.events} initialHasMore={data.pagination.count === PAGE_SIZE} />
  );
}
