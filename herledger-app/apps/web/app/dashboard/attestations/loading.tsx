import { AttestationListSkeleton } from "@/components/ui/loading-skeletons";
import { SkeletonBlock } from "@/components/ui/skeleton";

export default function AttestationsLoading() {
  return (
    <div role="status" aria-label="Loading attestations">
      <span className="sr-only">Loading attestations…</span>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--spacing-xl)",
          gap: "1rem",
        }}
      >
        <SkeletonBlock width="40%" height="1.5rem" />
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <SkeletonBlock width="9rem" height="2.25rem" />
          <SkeletonBlock width="7rem" height="2.25rem" />
        </div>
      </div>
      <AttestationListSkeleton />
    </div>
  );
}
