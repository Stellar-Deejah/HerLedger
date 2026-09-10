"use client";

import { useEffect, useState } from "react";

import type { FinancialEventDto } from "@/app/api/activity/recent/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { useEventStream } from "@/hooks/use-event-stream";
import { apiClient } from "@/lib/api/client";
import { formatAmount } from "@/lib/utils/format";

export interface OverviewBusinessProfile {
  displayName: string;
  active: boolean;
}

interface DashboardSummaryProps {
  initialEvents: FinancialEventDto[];
  attestationCount: number;
  businessProfile: OverviewBusinessProfile | null;
}

export function DashboardSummary({
  initialEvents,
  attestationCount,
  businessProfile,
}: DashboardSummaryProps) {
  const [events, setEvents] = useState<FinancialEventDto[]>(initialEvents);
  const [error, setError] = useState<string | null>(null);
  const { newEvents } = useEventStream();

  useEffect(() => {
    async function refresh() {
      try {
        const data = await apiClient.activity.recent();
        setEvents(data.events);
      } catch {
        setError("Could not load recent activity. Please try again.");
      }
    }
    if (newEvents.length > 0) void refresh();
  }, [newEvents]);

  if (error) {
    return (
      <div role="alert" style={{ color: "var(--danger)", fontSize: "0.9375rem" }}>
        {error}
      </div>
    );
  }
  if (events.length === 0) {
    return (
      <div>
        {businessProfile && (
          <p>
            {businessProfile.displayName} · {businessProfile.active ? "Active" : "Inactive"} ·{" "}
            {attestationCount} active attestations
          </p>
        )}
        <EmptyState
          title="No verified financial activity yet."
          description="Once your business is registered and supported Stellar transactions are detected, your activity will appear here."
        />
      </div>
    );
  }

  return (
    <div>
      {businessProfile && (
        <p>
          {businessProfile.displayName} · {businessProfile.active ? "Active" : "Inactive"} ·{" "}
          {attestationCount} active attestations
        </p>
      )}
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
              <div style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.125rem" }}>
                Ledger {event.ledgerSequence}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <span style={{ fontFamily: "monospace", fontSize: "0.9375rem" }}>
                {formatAmount(BigInt(event.amount))}
              </span>
              <StatusBadge
                status={event.status as "Pending" | "Verified" | "Disputed" | "Revoked"}
              />
            </div>
          </li>
        ))}
      </ul>
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
