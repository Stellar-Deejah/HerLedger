"use client";

import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";

import type { FinancialEventDto } from "@/app/api/activity/recent/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { useEventStream } from "@/hooks/use-event-stream";
import { apiClient, ApiRequestError } from "@/lib/api/client";
import { formatAmount } from "@/lib/utils/format";

import { PAGE_SIZE } from "./constants";

interface ActivityListProps {
  /** Page 0, fetched server-side (see ActivityListServer) so it's available on first paint. */
  initialEvents: FinancialEventDto[];
  initialHasMore: boolean;
}

export function ActivityList({ initialEvents, initialHasMore }: ActivityListProps) {
  const router = useRouter();
  const [events, setEvents] = useState<FinancialEventDto[]>(initialEvents);
  const { newEvents } = useEventStream();
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  // Page 0's data already arrived via props from the server — this effect
  // should only run when the user actually changes pages.
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    let ignore = false;

    async function loadPage() {
      setLoading(true);
      setError(null);
      try {
        const data = await apiClient.activity.recent({ offset, limit: PAGE_SIZE });
        if (ignore) return;
        setEvents(data.events);
        setHasMore(data.pagination.count === PAGE_SIZE);
      } catch (err) {
        if (ignore) return;
        if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
          setError("Please sign in again to view your activity.");
        } else {
          setError("Could not load activity. Please try again.");
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadPage();
    return () => {
      ignore = true;
    };
  }, [offset]);

  // Real-time events from the stream are overlaid onto the fetched page
  // (rather than merged into `events` via an effect) so this is a plain
  // render-time derivation, not a "sync state from another value" effect.
  // Only applies to the first page -- older pages are a fetched snapshot.
  const displayedEvents = useMemo(() => {
    if (offset !== 0 || newEvents.length === 0) return events;

    // Cast newEvents to FinancialEventDto[] to satisfy the strict Zod literal types
    const merged = [...(newEvents as unknown as FinancialEventDto[]), ...events];
    const seen = new Set<string>();
    return merged
      .filter((e) => {
        if (seen.has(e.eventId)) return false;
        seen.add(e.eventId);
        return true;
      })
      .slice(0, PAGE_SIZE); // Keep it strictly PAGE_SIZE on first page
  }, [events, newEvents, offset]);

  if (loading) return <LoadingSpinner label="Loading activity…" />;

  if (error) {
    return (
      <div role="alert" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  }

  if (displayedEvents.length === 0 && offset === 0) {
    return (
      <EmptyState
        title="No financial activity yet."
        description="Supported Stellar transactions involving your registered wallet will appear here."
      />
    );
  }

  return (
    <div>
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}
        aria-label="Financial activity"
      >
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Date</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Type</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Amount</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Status</th>
            <th className="activity-col-secondary" style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>
              Ledger
            </th>
            <th className="activity-col-secondary" style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>
              Stellar ref
            </th>
          </tr>
        </thead>
        <tbody>
          {displayedEvents.map((event) => {
            // Cast needed: typedRoutes can't statically validate a dynamic
            // segment built from a runtime value, only literal route strings.
            const detailHref = `/dashboard/activity/${event.eventId}` as Route;
            return (
              // Mouse-only convenience: keyboard/screen-reader access to the
              // detail page goes through the real <Link> in the Type cell
              // below, not this row.
              <tr
                key={event.id}
                data-testid={`activity-row-${event.eventId}`}
                onClick={() => router.push(detailHref)}
                style={{ borderBottom: "1px solid var(--border)", cursor: "pointer" }}
              >
                <td style={{ padding: "0.75rem", color: "var(--muted)" }}>
                  {formatDate(event.createdAt)}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <Link href={detailHref}>{formatEventType(event.eventType)}</Link>
                </td>
                <td style={{ padding: "0.75rem", fontFamily: "monospace" }}>
                  {formatAmount(BigInt(event.amount))}
                </td>
                <td style={{ padding: "0.75rem" }}>
                  <StatusBadge status={event.status} />
                </td>
                <td
                  className="activity-col-secondary"
                  style={{ padding: "0.75rem", color: "var(--muted)" }}
                >
                  {event.ledgerSequence}
                </td>
                <td
                  className="activity-col-secondary"
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
                    onClick={(e) => e.stopPropagation()}
                  >
                    {event.stellarReference.slice(0, 12)}…
                  </a>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginTop: "1rem",
          fontSize: "0.875rem",
        }}
      >
        <button
          onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
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
          onClick={() => setOffset(offset + PAGE_SIZE)}
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

function formatDate(isoDate: string): string {
  return new Date(isoDate).toLocaleDateString();
}
