import { OverviewSkeleton } from "@/components/ui/loading-skeletons";
import { SkeletonBlock } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div role="status" aria-label="Loading dashboard">
      <span className="sr-only">Loading dashboard…</span>
      <SkeletonBlock width="40%" height="1.5rem" style={{ marginBottom: "var(--spacing-xl)" }} />
      <OverviewSkeleton />
    </div>
  );
}
