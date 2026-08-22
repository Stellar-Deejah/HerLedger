"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";

import type { FinancialEventDto } from "@/app/api/activity/recent/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useEventStream } from "@/hooks/use-event-stream";
import { apiClient } from "@/lib/api/client";
import { formatAmount, formatLedger } from "@/lib/utils/format";

export interface OverviewBusinessProfile {
  displayName: string;
  active: boolean;
}

interface DashboardSummaryProps {
  /** Fetched server-side (see OverviewPanel) so it's available on first paint. */
  initialEvents: FinancialEventDto[];
  attestationCount: number;
  businessProfile: OverviewBusinessProfile | null;
}

export function DashboardSummary({
  initialEvents,
  attestationCount,
  businessProfile,
}: DashboardSummaryProps) {
  const t = useTranslations("activity");
  const locale = useLocale();
  const [events, setEvents] = useState<FinancialEventDto[]>(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const { newEvents } = useEventStream();

  // Re-fetches recent activity whenever the live SSE stream reports new
  // events — attestationCount/businessProfile don't need the same
  // treatment, since they aren't affected by FinancialEvent writes.
  useEffect(() => {
    async function refetchSummary() {
      try {
        const data = await apiClient.activity.recent();
        setEvents(data.events);
      } catch {
        setError(t("loadRecentError"));
      }
    }

    if (newEvents.length > 0) {
      void refetchSummary();
    }
  }, [newEvents, t]);

  return (
    <div>
      {businessProfile && (
        <div
          style={{
            display: "flex",
            gap: "1.5rem",
            marginBottom: "1.5rem",
            padding: "1rem 1.25rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
          }}
        >
          <div>
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>{t("business")}</div>
            <div style={{ fontWeight: 500 }}>{businessProfile.displayName}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>{t("status")}</div>
            <div
              style={{
                fontWeight: 500,
                color: businessProfile.active
                  ? "var(--color-success-text)"
                  : "var(--color-error-text)",
              }}
            >
              {businessProfile.active ? t("active") : t("inactive")}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
              {t("activeAttestations")}
            </div>
            <div style={{ fontWeight: 500 }}>{attestationCount}</div>
          </div>
        </div>
      )}

      {error && (
        <div role="alert" style={{ color: "var(--danger)", fontSize: "0.9375rem" }}>
          {error}
        </div>
      )}

      {events.length === 0 ? (
        <EmptyState title={t("emptyVerifiedTitle")} description={t("emptyVerifiedDescription")} />
      ) : (
        <div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            {t("recentActivity")}
          </h2>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {events.map((event) => (
              <li
                key={event.eventId}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.75rem 0",
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <div>
                  <span style={{ fontWeight: 500, fontSize: "0.9375rem" }}>
                    {formatEventType(event.eventType, t)}
                  </span>
                  <div
                    style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.125rem" }}
                  >
                    {t("ledgerLabel", { sequence: formatLedger(event.ledgerSequence, locale) })}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.9375rem" }}>
                    {formatAmount(BigInt(event.amount), locale)}
                  </span>
                  <StatusBadge status={event.status} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
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
