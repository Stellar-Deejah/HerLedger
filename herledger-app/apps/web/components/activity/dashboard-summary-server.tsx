import { getTranslations } from "next-intl/server";

import { getRecentActivity } from "@/lib/data/activity";
import { getActiveAttestationCount } from "@/lib/data/attestations";

import { DashboardSummary, type OverviewBusinessProfile } from "./dashboard-summary";

interface OverviewPanelProps {
  businessId: string | null;
  businessProfile: OverviewBusinessProfile | null;
}

/**
 * Server Component: the one place in the app that fans out independent
 * queries via Promise.all in a single render pass (recent activity +
 * active attestation count) — businessProfile itself is resolved by the
 * caller (app/dashboard/page.tsx) since it's needed to derive businessId
 * before either of these queries can run.
 */
export async function OverviewPanel({ businessId, businessProfile }: OverviewPanelProps) {
  const t = await getTranslations("activity");
  let result: [Awaited<ReturnType<typeof getRecentActivity>>, number] | null = null;
  try {
    result = await Promise.all([
      getRecentActivity(businessId, { offset: 0, limit: 20 }),
      getActiveAttestationCount(businessId),
    ]);
  } catch {
    result = null;
  }

  if (!result) {
    return (
      <div role="alert" style={{ color: "var(--danger)", fontSize: "0.9375rem" }}>
        {t("loadRecentError")}
      </div>
    );
  }

  const [activity, attestationCount] = result;

  return (
    <DashboardSummary
      initialEvents={activity.events}
      attestationCount={attestationCount}
      businessProfile={businessProfile}
    />
  );
}
