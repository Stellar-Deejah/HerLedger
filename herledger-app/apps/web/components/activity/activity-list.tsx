"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useRef, useState } from "react";

import type { FinancialEventDto } from "@/app/api/activity/recent/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { useEventStream } from "@/hooks/use-event-stream";
import { apiClient, ApiRequestError } from "@/lib/api/client";
import { formatAmount, formatDate } from "@/lib/utils/format";

export const PAGE_SIZE = 20;

interface ActivityListProps {
  /** Page 0, fetched server-side (see ActivityListServer) so it's available on first paint. */
  initialEvents: FinancialEventDto[];
  initialHasMore: boolean;
}

export function ActivityList({ initialEvents, initialHasMore }: ActivityListProps) {
  const t = useTranslations("activity");
  const locale = useLocale();
  const [events, setEvents] = useState<FinancialEventDto[]>(initialEvents);
  const { newEvents } = useEventStream();
  const [offset, setOffset] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(initialHasMore);
  // Page 0's data already arrived via props from the server — this effect
  // should only run when the user actually changes pages or the date range.
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
        const data = await apiClient.activity.recent({
          offset,
          limit: PAGE_SIZE,
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        });
        if (ignore) return;
        setEvents(data.events);
        setHasMore(data.pagination.count === PAGE_SIZE);
      } catch (err) {
        if (ignore) return;
        if (err instanceof ApiRequestError && err.code === "UNAUTHORIZED") {
          setError(t("signInAgain"));
        } else {
          setError(t("loadError"));
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    }

    void loadPage();
    return () => {
      ignore = true;
    };
  }, [offset, t, startDate, endDate]);

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

  // A new range starts back at page 0 -- filtering while on page 3 of the
  // old range would otherwise apply the new dates at a stale offset.
  function handleRangeChange(next: { startDate?: string; endDate?: string }) {
    if ("startDate" in next) setStartDate(next.startDate ?? "");
    if ("endDate" in next) setEndDate(next.endDate ?? "");
    setOffset(0);
  }

  const rangeControls = (
    <div
      style={{
        display: "flex",
        alignItems: "flex-end",
        flexWrap: "wrap",
        gap: "var(--spacing-md)",
        marginBottom: "var(--spacing-lg)",
      }}
    >
      <label style={{ fontSize: "var(--font-size-sm)" }}>
        <div style={{ color: "var(--muted)", marginBottom: "var(--spacing-xs)" }}>From</div>
        <input
          type="date"
          value={startDate}
          max={endDate || undefined}
          onChange={(e) => handleRangeChange({ startDate: e.target.value })}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "0.375rem 0.5rem",
          }}
        />
      </label>
      <label style={{ fontSize: "var(--font-size-sm)" }}>
        <div style={{ color: "var(--muted)", marginBottom: "var(--spacing-xs)" }}>To</div>
        <input
          type="date"
          value={endDate}
          min={startDate || undefined}
          onChange={(e) => handleRangeChange({ endDate: e.target.value })}
          style={{
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            padding: "0.375rem 0.5rem",
          }}
        />
      </label>
      {(startDate || endDate) && (
        <button
          type="button"
          onClick={() => handleRangeChange({ startDate: "", endDate: "" })}
          style={{
            background: "none",
            border: "none",
            color: "var(--color-brand)",
            cursor: "pointer",
            fontSize: "var(--font-size-sm)",
            padding: "0.375rem 0",
          }}
        >
          Clear
        </button>
      )}
      <a
        href={apiClient.activity.exportUrl({
          ...(startDate ? { startDate } : {}),
          ...(endDate ? { endDate } : {}),
        })}
        style={{
          marginLeft: "auto",
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "0.375rem 0.75rem",
          fontSize: "var(--font-size-sm)",
          color: "inherit",
          textDecoration: "none",
        }}
      >
        Export CSV
      </a>
    </div>
  );

  if (loading) {
    return (
      <div>
        {rangeControls}
        <LoadingSpinner label={t("loading")} />
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {rangeControls}
        <div role="alert" style={{ color: "var(--danger)" }}>
          {error}
        </div>
      </div>
    );
  }

  if (displayedEvents.length === 0 && offset === 0) {
    return (
      <div>
        {rangeControls}
        <EmptyState
          title={t(startDate || endDate ? "emptyDateRangeTitle" : "emptyTitle")}
          description={t("emptyDescription")}
        />
      </div>
    );
  }

  return (
    <div>
      {rangeControls}
      <table
        style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9375rem" }}
        aria-label={t("tableAria")}
      >
        <thead>
          <tr style={{ borderBottom: "2px solid var(--border)", textAlign: "left" }}>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{t("date")}</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{t("type")}</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{t("amount")}</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{t("status")}</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{t("ledger")}</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>{t("stellarRef")}</th>
          </tr>
        </thead>
        <tbody>
          {displayedEvents.map((event) => (
            <tr key={event.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.75rem", whiteSpace: "nowrap", color: "var(--muted)" }}>
                {formatDate(event.createdAt, locale)}
              </td>
              <td style={{ padding: "0.75rem" }}>{formatEventType(event.eventType, t)}</td>
              <td style={{ padding: "0.75rem", fontFamily: "monospace" }}>
                {formatAmount(BigInt(event.amount), locale)}
              </td>
              <td style={{ padding: "0.75rem" }}>
                <StatusBadge status={event.status} />
              </td>
              <td style={{ padding: "0.75rem", color: "var(--muted)" }}>{event.ledgerSequence}</td>
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
                  aria-label={t("viewTxAria", { reference: event.stellarReference })}
                >
                  {event.stellarReference.slice(0, 12)}…
                </a>
              </td>
            </tr>
          ))}
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
          aria-label={t("previousAria")}
        >
          {t("previous")}
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
          aria-label={t("nextAria")}
        >
          {t("next")}
        </button>
      </div>
    </div>
  );
}

const EVENT_TYPE_KEYS = new Set([
  "PaymentReceived",
  "PaymentSent",
  "InvoiceSettled",
  "CommitmentFulfilled",
]);

function formatEventType(type: string, t: (key: string) => string): string {
  // Unknown/legacy event types render as-is rather than throwing on a
  // missing message key.
  return EVENT_TYPE_KEYS.has(type) ? t(`eventType.${type}`) : type;
}
