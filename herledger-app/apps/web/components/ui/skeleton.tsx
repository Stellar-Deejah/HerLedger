import type { CSSProperties } from "react";

// ---------------------------------------------------------------------------
// Skeleton loading primitives.
//
// These are purely decorative placeholders used as Suspense fallbacks (and
// by `loading.tsx`) while a route segment or data widget streams in. They
// derive from the shared `.skeleton` class in globals.css, so the pulse
// animation is disabled automatically under `prefers-reduced-motion`.
//
// Accessibility contract: every Skeleton is `aria-hidden` (screen-reader
// neutral) and contains no focusable children, so it never adds or shifts
// keyboard focus. An accessible live-region announcement ("Loading…") comes
// from the `role="status"` wrapper a `loading.tsx` / Suspense fallback adds
// around these primitives — see app/dashboard/*/loading.tsx and the
// composite skeletons in ./loading-skeletons.
// ---------------------------------------------------------------------------

export interface SkeletonBlockProps {
  /** Block width, e.g. "100%", "40%", "12rem". Defaults to "100%". */
  width?: string;
  /** Block height. Defaults to one text line. */
  height?: string;
  /** Extra inline styles (spacing, display) for layout. */
  style?: CSSProperties;
}

/**
 * SkeletonBlock is the lowest-level skeleton: a muted, rounded rectangle
 * that pulses while content streams in.
 */
export function SkeletonBlock({ width = "100%", height = "0.75rem", style }: SkeletonBlockProps) {
  return <span aria-hidden="true" className="skeleton" style={{ height, width, ...style }} />;
}

export interface SkeletonRowProps {
  /** Per-column widths. Defaults to a generic four-column layout. */
  widths?: string[];
  /** Height of each block. */
  height?: string;
  /** Gap between columns. */
  gap?: string;
  /** Drop the bottom divider used between list rows. */
  borderBottom?: boolean;
}

/**
 * SkeletonRow renders a horizontal row of skeleton blocks, mirroring the
 * shape of a list row or table row.
 */
export function SkeletonRow({
  widths,
  height = "0.9375rem",
  gap = "var(--spacing-md)",
  borderBottom = true,
}: SkeletonRowProps) {
  const columns = widths ?? ["40%", "25%", "15%", "20%"];
  return (
    <div
      aria-hidden="true"
      style={{
        display: "flex",
        alignItems: "center",
        gap,
        padding: "0.75rem 0",
        ...(borderBottom ? { borderBottom: "1px solid var(--border)" } : {}),
      }}
    >
      {columns.map((width, i) => (
        <SkeletonBlock key={i} width={width} height={height} />
      ))}
    </div>
  );
}

export interface SkeletonCardProps {
  /** Number of placeholder body lines inside the card. */
  lines?: number;
  /** Render a title bar at the top of the card. */
  showTitle?: boolean;
  /** Height of the title bar. */
  titleHeight?: string;
}

/**
 * SkeletonCard renders a bordered card of placeholder lines, matching the
 * shape of content panels like the business profile, settings sections, and
 * attestation cards.
 */
export function SkeletonCard({
  lines = 3,
  showTitle = true,
  titleHeight = "1rem",
}: SkeletonCardProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        border: "1px solid var(--border)",
        borderRadius: "var(--radius)",
        padding: "var(--spacing-xl)",
      }}
    >
      {showTitle && (
        <SkeletonBlock
          width="40%"
          height={titleHeight}
          style={{ marginBottom: "var(--spacing-lg)" }}
        />
      )}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonBlock
          key={i}
          width={`${Math.max(30, 95 - (i % 6) * 12)}%`}
          height="0.75rem"
          style={{ display: "block", marginBottom: "var(--spacing-md)" }}
        />
      ))}
    </div>
  );
}

export interface SkeletonTableProps {
  /** Number of data rows to render (header is added on top). */
  rows?: number;
  /** Number of columns. Defaults to the activity table's five columns. */
  columns?: number;
  /** Optional per-column widths (fractions of the container). */
  widths?: string[];
}

/** Default column widths mirroring the ActivityList table layout. */
const DEFAULT_TABLE_WIDTHS = ["30%", "20%", "12%", "12%", "26%"];

/**
 * SkeletonTable renders a header row plus N data rows, matching the spatial
 * layout of a data table such as the financial activity list.
 */
export function SkeletonTable({ rows = 5, columns, widths }: SkeletonTableProps) {
  const columnWidths =
    widths ?? (columns ? DEFAULT_TABLE_WIDTHS.slice(0, columns) : DEFAULT_TABLE_WIDTHS);
  const rowCount = rows + 1; // + header row

  return (
    <div aria-hidden="true" style={{ width: "100%" }}>
      {Array.from({ length: rowCount }).map((_, i) => {
        const isHeader = i === 0;
        return (
          <div
            key={i}
            style={{
              display: "flex",
              gap: "var(--spacing-md)",
              padding: isHeader ? "0.5rem 0.75rem" : "0.75rem",
              borderBottom: isHeader ? "2px solid var(--border)" : "1px solid var(--border)",
            }}
          >
            {columnWidths.map((width, j) => (
              <SkeletonBlock key={j} width={width} height={isHeader ? "0.625rem" : "0.9375rem"} />
            ))}
          </div>
        );
      })}
    </div>
  );
}
