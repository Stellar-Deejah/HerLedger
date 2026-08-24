import { getRecentActivity } from "@/lib/data/activity";
import { getActivitySummary } from "@/lib/data/activity-summary";
import { getActiveAttestationCount } from "@/lib/data/attestations";

import { DashboardSummary, type OverviewBusinessProfile } from "./dashboard-summary";

interface OverviewPanelProps {
  businessId: string | null;
  businessProfile: OverviewBusinessProfile | null;
}

/**
 * Server Component: the one place in the app that fans out independent
 * queries via Promise.all in a single render pass (recent activity, KPI
 * summary, and active attestation count) — businessProfile itself is
 * resolved by the caller (app/dashboard/page.tsx) since it's needed to
 * derive businessId before any of these queries can run.
 */
export async function OverviewPanel({ businessId, businessProfile }: OverviewPanelProps) {
  let result:
    | [
        Awaited<ReturnType<typeof getRecentActivity>>,
        Awaited<ReturnType<typeof getActivitySummary>>,
        number,
      ]
    | null = null;
  try {
    result = await Promise.all([
      getRecentActivity(businessId, { offset: 0, limit: 20 }),
      getActivitySummary(businessId),
      getActiveAttestationCount(businessId),
    ]);
  } catch {
    result = null;
  }

  if (!result) {
    return (
      <div role="alert" style={{ color: "var(--danger)", fontSize: "0.9375rem" }}>
        Could not load recent activity. Please try again.
      </div>
    );
  }

  const [activity, summary, attestationCount] = result;

  return (
    <DashboardSummary
      initialEvents={activity.events}
      initialSummary={summary}
      attestationCount={attestationCount}
      businessProfile={businessProfile}
    />
  );
}
