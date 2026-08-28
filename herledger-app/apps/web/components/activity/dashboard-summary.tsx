"use client";

import { useEffect, useState } from "react";

import type { FinancialEventDto } from "@/app/api/activity/recent/schema";
import type { ActivitySummaryData } from "@/app/api/v1/activity/summary/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useEventStream } from "@/hooks/use-event-stream";
import { apiClient } from "@/lib/api/client";
import { formatAmount } from "@/lib/utils/format";

import { KpiSummary } from "./kpi-summary";

export interface OverviewBusinessProfile {
  displayName: string;
  active: boolean;
}

interface DashboardSummaryProps {
  /** Fetched server-side (see OverviewPanel) so it's available on first paint. */
  initialEvents: FinancialEventDto[];
  initialSummary: ActivitySummaryData;
  attestationCount: number;
  businessProfile: OverviewBusinessProfile | null;
}

export function DashboardSummary({
  initialEvents,
  initialSummary,
  attestationCount,
  businessProfile,
}: DashboardSummaryProps) {
  const [events, setEvents] = useState<FinancialEventDto[]>(initialEvents);
  const [summary, setSummary] = useState<ActivitySummaryData>(initialSummary);
  const [error, setError] = useState<string | null>(null);
  const { newEvents } = useEventStream();

  // Re-fetches recent activity and the KPI summary whenever the live SSE
  // stream reports new events — attestationCount/businessProfile don't need
  // the same treatment, since they aren't affected by FinancialEvent writes.
  useEffect(() => {
    async function refetchSummary() {
      try {
        const [activity, kpis] = await Promise.all([
          apiClient.activity.recent(),
          apiClient.activity.summary(),
        ]);
        setEvents(activity.events);
        setSummary(kpis);
      } catch {
        setError("Could not load recent activity. Please try again.");
      }
    }

    if (newEvents.length > 0) {
      void refetchSummary();
    }
  }, [newEvents]);

  return (
    <div>
      <KpiSummary summary={summary} />

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
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Business</div>
            <div style={{ fontWeight: 500 }}>{businessProfile.displayName}</div>
          </div>
          <div>
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Status</div>
            <div
              style={{
                fontWeight: 500,
                color: businessProfile.active
                  ? "var(--color-success-text)"
                  : "var(--color-error-text)",
              }}
            >
              {businessProfile.active ? "Active" : "Inactive"}
            </div>
          </div>
          <div>
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>Active attestations</div>
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
        <EmptyState
          title="No verified financial activity yet."
          description="Once your business is registered and supported Stellar transactions are detected, your activity will appear here."
        />
      ) : (
        <div>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
            Recent activity
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
                    {formatEventType(event.eventType)}
                  </span>
                  <div
                    style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.125rem" }}
                  >
                    Ledger {event.ledgerSequence}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                  <span style={{ fontFamily: "monospace", fontSize: "0.9375rem" }}>
                    {formatAmount(BigInt(event.amount))}
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

function formatEventType(type: string): string {
  const labels: Record<string, string> = {
    PaymentReceived: "Payment received",
    PaymentSent: "Payment sent",
    InvoiceSettled: "Invoice settled",
    CommitmentFulfilled: "Commitment fulfilled",
  };
  return labels[type] ?? type;
}
