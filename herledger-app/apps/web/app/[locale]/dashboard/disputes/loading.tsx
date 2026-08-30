import { SkeletonBlock, SkeletonRow } from "@/components/ui/skeleton";

export default function DisputesLoading() {
  return (
    <div role="status" aria-label="Loading disputes">
      <span className="sr-only">Loading disputes…</span>
      <SkeletonBlock width="40%" height="1.5rem" style={{ marginBottom: "var(--spacing-xl)" }} />
      {Array.from({ length: 5 }).map((_, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 0",
            borderBottom: i < 4 ? "1px solid var(--border)" : "none",
          }}
        >
          <div style={{ flex: 1, marginRight: "var(--spacing-lg)" }}>
            <SkeletonRow widths={["45%", "25%"]} borderBottom={false} />
          </div>
          <SkeletonBlock width="6rem" height="2rem" />
        </div>
      ))}
    </div>
  );
}
