import { SkeletonBlock, SkeletonCard, SkeletonRow, SkeletonTable } from "./skeleton";

// ---------------------------------------------------------------------------
// Composite skeletons that mirror the spatial layout of a dashboard segment.
//
// These are used in two places:
//   1. Inside each dashboard route's `loading.tsx` (the whole-segment shell —
//      the consumer adds a title-bar skeleton and a `role="status"` live
//      region around these).
//   2. As the fallback of the <Suspense> boundary that a page already wraps
//      around its data-fetching server component, so the spinner that used to
//      appear is replaced by a skeleton shaped like the content.
//
// Like the Skeleton* primitives, every composite is `aria-hidden` and
// keyboard-neutral (no focusable children).
// ---------------------------------------------------------------------------

/**
 * Spatially mirrors the /dashboard overview: a row of KPI cards, the
 * business-info bar, and the recent-activity table.
 */
export function OverviewSkeleton() {
  return (
    <div aria-hidden="true">
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "var(--spacing-lg)",
          marginBottom: "var(--spacing-xl)",
        }}
      >
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            style={{
              flex: "1 1 160px",
              padding: "var(--spacing-lg)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
            }}
          >
            <SkeletonBlock
              width="70%"
              height="0.75rem"
              style={{ marginBottom: "var(--spacing-md)" }}
            />
            <SkeletonBlock width="50%" height="1rem" />
          </div>
        ))}
      </div>

      <div style={{ marginBottom: "var(--spacing-xl)" }}>
        <SkeletonRow widths={["30%", "20%", "15%"]} height="0.9375rem" />
        <SkeletonRow widths={["30%", "20%", "15%"]} height="0.9375rem" borderBottom={false} />
      </div>

      <SkeletonBlock width="30%" height="1.125rem" style={{ marginBottom: "var(--spacing-lg)" }} />
      <SkeletonTable rows={4} widths={["30%", "20%", "12%", "12%", "26%"]} />
    </div>
  );
}

/**
 * Spatially mirrors /dashboard/activity: the date-range controls plus the
 * financial-activity table and its pagination buttons.
 */
export function ActivityListSkeleton() {
  return (
    <div aria-hidden="true">
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: "var(--spacing-md)",
          marginBottom: "var(--spacing-lg)",
        }}
      >
        <SkeletonBlock width="8rem" height="0.625rem" />
        <SkeletonBlock width="8rem" height="0.625rem" />
        <SkeletonBlock width="4rem" height="0.625rem" />
        <SkeletonBlock width="5rem" height="2.25rem" style={{ marginLeft: "auto" }} />
      </div>

      <SkeletonTable rows={6} widths={["30%", "20%", "12%", "12%", "26%"]} />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "1rem",
        }}
      >
        <SkeletonBlock width="6rem" height="2.25rem" />
        <SkeletonBlock width="4rem" height="2.25rem" />
      </div>
    </div>
  );
}

/**
 * Spatially mirrors /dashboard/attestations: a stack of bordered attestation
 * cards, each with a title bar and a few label/value lines.
 */
export function AttestationListSkeleton({ cards = 3 }: { cards?: number }) {
  return (
    <div
      aria-hidden="true"
      style={{ display: "flex", flexDirection: "column", gap: "var(--spacing-lg)" }}
    >
      {Array.from({ length: cards }).map((_, i) => (
        <SkeletonCard key={i} lines={4} titleHeight="0.9375rem" />
      ))}
    </div>
  );
}
