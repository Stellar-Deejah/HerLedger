import { SkeletonBlock, SkeletonCard } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <div role="status" aria-label="Loading settings">
      <span className="sr-only">Loading settings…</span>
      <SkeletonBlock width="40%" height="1.5rem" style={{ marginBottom: "var(--spacing-xl)" }} />
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-xl)" }}>
        <SkeletonCard lines={2} titleHeight="1.125rem" />
        <SkeletonCard lines={4} titleHeight="1.125rem" />
        <SkeletonCard lines={3} titleHeight="1.125rem" />
      </div>
    </div>
  );
}
