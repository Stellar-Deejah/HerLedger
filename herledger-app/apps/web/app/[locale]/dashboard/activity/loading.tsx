import { ActivityListSkeleton } from "@/components/ui/loading-skeletons";
import { SkeletonBlock } from "@/components/ui/skeleton";

export default function ActivityLoading() {
  return (
    <div role="status" aria-label="Loading financial activity">
      <span className="sr-only">Loading financial activity…</span>
      <SkeletonBlock width="50%" height="1.5rem" style={{ marginBottom: "var(--spacing-xl)" }} />
      <ActivityListSkeleton />
    </div>
  );
}
