"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { StatusBadge } from "@/components/ui/status-badge";

interface AttestationRow {
  id: string;
  attestationId: string;
  eventId: string;
  attesterAddress: string;
  claimHash: string;
  status: string;
  ledgerSequence: number;
}

export function AttestationList() {
  const [attestations, setAttestations] = useState<AttestationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const res = await fetch("/api/attestations");
        if (!res.ok) throw new Error();
        const json = (await res.json()) as { data: { attestations: AttestationRow[] } | null };
        setAttestations(json.data?.attestations ?? []);
      } catch {
        setError("Could not load attestations.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) {
    return (
      <div role="alert" style={{ color: "var(--danger)" }}>
        {error}
      </div>
    );
  }
  if (attestations.length === 0) {
    return (
      <EmptyState
        title="No attestations yet."
        description="Verified attestations for your financial events will appear here."
      />
    );
  }

  return (
    <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
      {attestations.map((att) => (
        <li
          key={att.id}
          style={{
            padding: "1rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            marginBottom: "0.75rem",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-start",
              marginBottom: "0.5rem",
            }}
          >
            <span style={{ fontWeight: 500, fontSize: "0.9375rem" }}>Attestation</span>
            <StatusBadge status={att.status as "Active" | "Revoked"} />
          </div>
          <dl style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <dt style={{ fontWeight: 500, minWidth: "80px" }}>Attester</dt>
              <dd style={{ fontFamily: "monospace", wordBreak: "break-all" }}>
                {att.attesterAddress}
              </dd>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <dt style={{ fontWeight: 500, minWidth: "80px" }}>Event</dt>
              <dd style={{ fontFamily: "monospace", fontSize: "0.8125rem" }}>
                {att.eventId.slice(0, 16)}…
              </dd>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <dt style={{ fontWeight: 500, minWidth: "80px" }}>Ledger</dt>
              <dd>{att.ledgerSequence}</dd>
            </div>
          </dl>
          {att.status === "Revoked" && (
            <p
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8125rem",
                color: "var(--danger)",
                fontWeight: 500,
              }}
            >
              This attestation has been revoked and is preserved for historical reference.
            </p>
          )}
        </li>
      ))}
    </ul>
  );
}
