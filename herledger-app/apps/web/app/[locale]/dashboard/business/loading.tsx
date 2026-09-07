import { SkeletonBlock, SkeletonCard } from "@/components/ui/skeleton";

export default function BusinessLoading() {
  return (
    <div role="status" aria-label="Loading business profile">
      <span className="sr-only">Loading business profile…</span>
      <SkeletonBlock width="50%" height="1.5rem" style={{ marginBottom: "var(--spacing-xl)" }} />
      <SkeletonCard lines={5} titleHeight="1.125rem" />
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "var(--spacing-xl)" }}>
        <SkeletonBlock width="8rem" height="2.25rem" />
        <SkeletonBlock width="7rem" height="2.25rem" />
      </div>
    </div>
  );
}
