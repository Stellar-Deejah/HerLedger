"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
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

export function DisputeList() {
  const [events, setEvents] = useState<DisputedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/activity/recent?limit=100");
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
          {event.status === "Disputed" && (
            <span style={{ fontSize: "0.875rem", color: "var(--warning)" }}>Disputed</span>
          )}
        </li>
      ))}
    </ul>
  );
}
