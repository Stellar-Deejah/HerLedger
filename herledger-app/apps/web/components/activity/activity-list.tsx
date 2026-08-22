"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

import type { ActivityRecentData, FinancialEventDto } from "@/app/api/activity/recent/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { useEventStream } from "@/hooks/use-event-stream";
import { apiClient, ApiRequestError } from "@/lib/api/client";
import { formatAmount } from "@/lib/utils/format";

export const PAGE_SIZE = 20;
const PAGE_SIZE_OPTIONS = [20, 50, 100, 200] as const;

// Rows are virtualized only once a page grows past this many rows; below it,
// the plain table renders every row (matching the existing markup and tests).
const VIRTUALIZATION_THRESHOLD = 100;
const ESTIMATED_ROW_HEIGHT_PX = 49;
const VIRTUAL_OVERSCAN = 10;

// SWR cache namespace. Pages are keyed by (offset, limit); the businessId is
// derived server-side from the authenticated session, so it does not appear
// in the client key.
const ACTIVITY_KEY = "activity/recent";

// Column proportions shared by the plain table and the virtualized grid so
// the header and rows stay aligned in both paths.
const GRID_TEMPLATE = "1.2fr 1fr 1fr 0.8fr 2fr";
const HEADER_LABELS = ["Type", "Amount", "Status", "Ledger", "Stellar ref"] as const;

interface ActivityListProps {
  /** Page 0, fetched server-side (see ActivityListServer) so it's available on first paint. */
  initialEvents: FinancialEventDto[];
  initialHasMore: boolean;
}

export function ActivityList({ initialEvents, initialHasMore }: ActivityListProps) {
  const { newEvents } = useEventStream();
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState<number>(PAGE_SIZE);

  const scrollRef = useRef<HTMLDivElement>(null);

  // Single source of truth for the current page. SWR dedupes identical keys
  // in-flight and serves previously-fetched pages from cache while a
  // background revalidation runs, so navigating back to a page is instant.
  // Page 0's server-rendered props seed the cache so first paint has data.
  const key = useMemo(() => [ACTIVITY_KEY, offset, limit] as const, [offset, limit]);

  // exactOptionalPropertyTypes forbids `fallbackData: undefined`, so the
  // option is only present when seeding the initial page.
  const swrConfig = {
    keepPreviousData: true,
    revalidateOnFocus: false,
    ...(offset === 0 && limit === PAGE_SIZE
      ? {
          fallbackData: {
            events: initialEvents,
            pagination: { offset: 0, limit: PAGE_SIZE, count: initialEvents.length },
          } satisfies ActivityRecentData,
        }
      : {}),
  } satisfies Parameters<typeof useSWR<ActivityRecentData, Error>>[2];

  const { data, error, isLoading } = useSWR<ActivityRecentData, Error>(
    key,
    async ([, pageOffset, pageLimit]) =>
      apiClient.activity.recent({ offset: pageOffset, limit: pageLimit }),
    swrConfig
  );

  const { mutate } = useSWRConfig();

  // When the SSE stream reports a new financial event, invalidate the cached
  // first page so it revalidates in the background (the event itself is also
  // overlaid below for an immediate render).
  useEffect(() => {
    if (newEvents.length > 0) {
      void mutate([ACTIVITY_KEY, 0, limit]);
    }
  }, [newEvents.length, limit, mutate]);

  // Memoize the fallback so an absent page yields a stable empty array
  // reference (otherwise `?? []` allocates a new array each render and the
  // derived `displayedEvents` memo below would recompute on every render).
  const events = useMemo(() => data?.events ?? [], [data]);
  const hasMore = data ? data.pagination.count === limit : initialHasMore;

  // Real-time events from the stream are overlaid onto the fetched first page
  // (rather than merged into `events` via an effect) so this is a plain
  // render-time derivation, not a "sync state from another value" effect.
  const displayedEvents = useMemo(() => {
    if (offset !== 0 || newEvents.length === 0) return events;

    const merged = [...(newEvents as unknown as FinancialEventDto[]), ...events];
    const seen = new Set<string>();
    return merged
      .filter((e) => {
        if (seen.has(e.eventId)) return false;
        seen.add(e.eventId);
        return true;
      })
      .slice(0, limit);
  }, [events, newEvents, offset, limit]);

  const shouldVirtualize = displayedEvents.length > VIRTUALIZATION_THRESHOLD;

  const rowVirtualizer = useVirtualizer({
    count: displayedEvents.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ESTIMATED_ROW_HEIGHT_PX,
    overscan: VIRTUAL_OVERSCAN,
    measureElement: (el) => el.getBoundingClientRect().height,
  });

  // Only the very first load (no cached page) shows a full spinner; page
  // changes with keepPreviousData render instantly from the stale page.
  if (isLoading && !data) return <LoadingSpinner label="Loading activity…" />;

  const authError = error instanceof ApiRequestError && error.code === "UNAUTHORIZED";

  // Full-page error state when there is nothing cached to fall back on.
  if (error && !data) {
    return (
      <div role="alert" style={{ color: "var(--danger)" }}>
        {authError
          ? "Please sign in again to view your activity."
          : "Could not load activity. Please try again."}
      </div>
    );
  }

  if (displayedEvents.length === 0 && offset === 0 && !error) {
    return (
      <EmptyState
        title="No financial activity yet."
        description="Supported Stellar transactions involving your registered wallet will appear here."
      />
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: "0.5rem",
          marginBottom: "0.75rem",
          fontSize: "0.875rem",
        }}
      >
        <label htmlFor="activity-page-size">Rows per page</label>
        <select
          id="activity-page-size"
          value={limit}
          onChange={(e) => {
            const next = Number(e.target.value);
            setOffset(0);
            setLimit(next);
          }}
          style={{
            padding: "0.25rem 0.5rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--bg)",
            color: "inherit",
          }}
        >
          {PAGE_SIZE_OPTIONS.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      {/* Revalidation error while stale data is shown — non-blocking note. */}
      {error && data && (
        <div
          role="status"
          style={{
            color: "var(--danger)",
            fontSize: "0.875rem",
            marginBottom: "0.5rem",
          }}
        >
          {authError
            ? "Please sign in again to view your activity."
            : "Could not refresh activity. Showing the last loaded page."}
        </div>
      )}

      {shouldVirtualize ? (
        <div
          ref={scrollRef}
          tabIndex={0}
          role="table"
          aria-label="Financial activity"
          aria-rowcount={displayedEvents.length + 1}
          style={{
            maxHeight: 480,
            overflowY: "auto",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: "0.9375rem",
          }}
        >
          <div
            role="row"
            style={{
              display: "grid",
              gridTemplateColumns: GRID_TEMPLATE,
              position: "sticky",
              top: 0,
              zIndex: 1,
              background: "var(--bg)",
              borderBottom: "2px solid var(--border)",
              fontWeight: 600,
            }}
          >
            {HEADER_LABELS.map((label) => (
              <div key={label} role="columnheader" style={{ padding: "0.5rem 0.75rem" }}>
                {label}
              </div>
            ))}
          </div>

          <div style={{ position: "relative", height: rowVirtualizer.getTotalSize() }}>
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const event = displayedEvents[virtualRow.index];
              if (!event) return null;
              return (
                <div
                  key={event.id}
                  ref={rowVirtualizer.measureElement}
                  data-index={virtualRow.index}
                  role="row"
                  aria-rowindex={virtualRow.index + 2}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                    display: "grid",
                    gridTemplateColumns: GRID_TEMPLATE,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <div role="gridcell" style={{ padding: "0.75rem" }}>
                    {formatEventType(event.eventType)}
                  </div>
                  <div role="gridcell" style={{ padding: "0.75rem", fontFamily: "monospace" }}>
                    {formatAmount(BigInt(event.amount))}
                  </div>
                  <div role="gridcell" style={{ padding: "0.75rem" }}>
                    <StatusBadge status={event.status} />
                  </div>
                  <div role="gridcell" style={{ padding: "0.75rem", color: "var(--muted)" }}>
                    {event.ledgerSequence}
                  </div>
                  <div
                    role="gridcell"
                    style={{
                      padding: "0.75rem",
                      fontFamily: "monospace",
                      fontSize: "0.8125rem",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <a
                      href={`https://stellar.expert/explorer/testnet/tx/${event.stellarReference}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={`View transaction ${event.stellarReference} on Stellar Expert`}
                    >
                      {event.stellarReference.slice(0, 12)}…
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <table
          style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}
          aria-label="Financial activity"
        >
          <thead>
            <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Type</th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Amount</th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Status</th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Ledger</th>
              <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Stellar ref</th>
            </tr>
          </thead>
          <tbody>
            {displayedEvents.map((event) => (
              <tr key={event.id} style={{ borderBottom: "1px solid var(--border)" }}>
                <td style={{ padding: "0.75rem" }}>{formatEventType(event.eventType)}</td>
                <td style={{ padding: "0.75rem", fontFamily: "monospace" }}>
                  {formatAmount(BigInt(event.amount))}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <StatusBadge status={event.status} />
                </td>
                <td style={{ padding: "0.75rem", color: "var(--muted)" }}>
                  {event.ledgerSequence}
                </td>
                <td
                  style={{
                    padding: "0.75rem",
                    fontFamily: "monospace",
                    fontSize: "0.8125rem",
                    maxWidth: "200px",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  <a
                    href={`https://stellar.expert/explorer/testnet/tx/${event.stellarReference}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`View transaction ${event.stellarReference} on Stellar Expert`}
                  >
                    {event.stellarReference.slice(0, 12)}…
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "1rem",
          fontSize: "0.875rem",
        }}
      >
        <button
          onClick={() => setOffset(Math.max(0, offset - limit))}
          disabled={offset === 0}
          type="button"
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "0.375rem 0.75rem",
            cursor: offset === 0 ? "not-allowed" : "pointer",
            color: offset === 0 ? "var(--muted)" : "inherit",
          }}
          aria-label="Previous page"
        >
          Previous
        </button>
        <button
          onClick={() => setOffset(offset + limit)}
          disabled={!hasMore}
          type="button"
          style={{
            background: "none",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "0.375rem 0.75rem",
            cursor: !hasMore ? "not-allowed" : "pointer",
            color: !hasMore ? "var(--muted)" : "inherit",
          }}
          aria-label="Next page"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    PaymentReceived: "Payment received",
    PaymentSent: "Payment sent",
    InvoiceSettled: "Invoice settled",
    CommitmentFulfilled: "Commitment fulfilled",
  };
  return labels[type] ?? type;
}
