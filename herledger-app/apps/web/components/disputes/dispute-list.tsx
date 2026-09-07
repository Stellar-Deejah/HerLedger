"use client";

import { getPublicEnv } from "@herledger/config";
import { useEffect, useState } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  DISPUTE_STATUS_LABELS,
  isDisputeTerminal,
  type DisputeStatus,
} from "@/lib/disputes/status";

import { DisputeForm } from "./dispute-form";

interface DisputedEvent {
  id: string;
  eventId: string;
  eventType: string;
  amount: string;
  status: string;
  stellarReference: string;
  ledgerSequence: number;
}

interface DisputeRecord {
  id: string;
  status: DisputeStatus;
  submittedAt: string;
  resolvedAt: string | null;
  resolutionTxHash: string | null;
}

export function DisputeList() {
  const [events, setEvents] = useState<DisputedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/v1/activity/recent?limit=100");
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { data: { events: DisputedEvent[] } | null };
        const all = json.data?.events ?? [];
        // Show events eligible for dispute (Pending or Verified)
        setEvents(
          all.filter(
            (e) => e.status === "Pending" || e.status === "Verified" || e.status === "Disputed"
          )
        );
      } catch {
        // silently degrade
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (events.length === 0) {
    return (
      <EmptyState
        title="No disputable events."
        description="Financial events that can be challenged will appear here."
      />
    );
  }

  if (selectedEventId) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setSelectedEventId(null)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--primary)",
            fontSize: "0.875rem",
            padding: 0,
            marginBottom: "1.5rem",
          }}
        >
          ← Back to events
        </button>
        <DisputeForm eventId={selectedEventId} onSuccess={() => setSelectedEventId(null)} />
      </div>
    );
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {events.map((event) => (
        <li
          key={event.id}
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "0.75rem 0",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <div>
            <span style={{ fontWeight: 500 }}>{event.eventType}</span>
            <div style={{ fontSize: "0.8125rem", color: "var(--muted)" }}>
              Ledger {event.ledgerSequence}
            </div>
          </div>
          {event.status !== "Disputed" && (
            <button
              type="button"
              onClick={() => setSelectedEventId(event.eventId)}
              style={{
                background: "none",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                padding: "0.375rem 0.75rem",
                cursor: "pointer",
                fontSize: "0.875rem",
              }}
            >
              Challenge
            </button>
          )}
          {event.status === "Disputed" && <DisputeLifecycle eventId={event.eventId} />}
        </li>
      ))}
    </ul>
  );
}

/**
 * Resolves the fuller off-chain dispute lifecycle (Submitted / Investigating
 * / Resolved / Revoked) for a Disputed event, and offers a "View resolution"
 * link once one is known. Isolated into its own component (rather than
 * fetched in bulk from the parent) so each row's request is independent and
 * a failure on one row can't blank out the rest of the list.
 */
function DisputeLifecycle({ eventId }: { eventId: string }) {
  const [dispute, setDispute] = useState<DisputeRecord | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch(`/api/v1/disputes/${eventId}`);
        if (!res.ok) return;
        const json = (await res.json()) as { data: { dispute: DisputeRecord } | null };
        if (!cancelled) setDispute(json.data?.dispute ?? null);
      } catch {
        // silently degrade -- the plain "Disputed" fallback below still
        // communicates the important fact (this event is under dispute).
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (loading || !dispute) {
    return <span style={{ fontSize: "0.875rem", color: "var(--warning)" }}>Disputed</span>;
  }

  const badge = DISPUTE_STATUS_LABELS[dispute.status];
  const network = getPublicEnv().NEXT_PUBLIC_STELLAR_NETWORK;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
      <span
        style={{
          display: "inline-block",
          padding: "0.125rem 0.5rem",
          borderRadius: "9999px",
          fontSize: "0.75rem",
          fontWeight: 500,
          background: badge.background,
          color: badge.color,
        }}
        aria-label={`Dispute status: ${badge.label}`}
      >
        {badge.label}
      </span>
      {isDisputeTerminal(dispute.status) && dispute.resolutionTxHash && (
        <a
          href={`https://stellar.expert/explorer/${network}/tx/${dispute.resolutionTxHash}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: "0.8125rem" }}
        >
          View resolution
        </a>
      )}
    </div>
  );
}
