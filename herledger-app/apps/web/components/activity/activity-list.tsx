"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatAmount } from "@/lib/utils/format";
import Link from "next/link";

interface FinancialEventRow {
  id: string;
  eventId: string;
  eventType: string;
  assetAddress: string;
  amount: string;
  status: string;
  stellarReference: string;
  ledgerSequence: number;
}

const PAGE_SIZE = 20;

export function ActivityList() {
  const [events, setEvents] = useState<FinancialEventRow[]>([]);
  const [offset, setOffset] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);

  async function fetchPage(pageOffset: number) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/activity/recent?offset=${pageOffset}&limit=${PAGE_SIZE}`);
      if (!res.ok) throw new Error("Failed to load activity");
      const json = (await res.json()) as {
        data: { events: FinancialEventRow[]; pagination: { count: number } } | null;
        error: unknown;
      };
      const data = json.data;
      if (!data) throw new Error("No data returned");
      setEvents(data.events);
      setHasMore(data.pagination.count === PAGE_SIZE);
    } catch {
      setError("Could not load activity. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void fetchPage(offset);
  }, [offset]);

  if (loading) return <LoadingSpinner label="Loading activity…" />;
  if (error) {
    return (
      <div role="alert" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  }
  if (events.length === 0 && offset === 0) {
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
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Type</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Amount</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Status</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Ledger</th>
            <th style={{ padding: "0.5rem 0.75rem", fontWeight: 600 }}>Stellar ref</th>
          </tr>
        </thead>
        <tbody>
          {events.map((event) => (
            <tr key={event.id} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.75rem" }}>{formatEventType(event.eventType)}</td>
              <td style={{ padding: "0.75rem", fontFamily: "monospace" }}>
                {formatAmount(BigInt(event.amount))}
              </td>
              <td style={{ padding: "0.75rem" }}>
                <StatusBadge
                  status={event.status as "Pending" | "Verified" | "Disputed" | "Revoked"}
                />
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
                  aria-label={`View transaction ${event.stellarReference} on Stellar Expert`}
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
