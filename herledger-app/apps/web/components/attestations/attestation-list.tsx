"use client";

import { isValidAttestation, resolveAttesterName } from "@herledger/sdk";
import { useEffect, useRef, useState } from "react";

import type { AttestationDto } from "@/app/api/attestations/schema";
import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import { hasStatusDiscrepancy } from "@/lib/attestations/reconcile";
import { getContractConfig, getStellarConfig } from "@/lib/stellar/network";

// ---------------------------------------------------------------------------
// On-chain re-validation trade-off: this checks `isValidAttestation` for
// each visible attestation on-demand (once per list load), rather than via
// a background job. Rationale:
//   - The attestation list is a low-traffic, business-owner-facing view —
//     not a hot path — so a few extra RPC read calls per page view is an
//     acceptable cost for catching stale indexer state, and there's no need
//     to run a periodic job that would mostly find nothing to reconcile.
//   - On-demand keeps the fix path simple: detect discrepancy → resync →
//     re-render, all within one page load, no queue/worker infrastructure.
//   - Trade-off: a business with many attestations pays one RPC call per
//     attestation per page view. If this list grows large, batching or a
//     background sweep (indexer-side, alongside its existing sync jobs)
//     would be worth revisiting — see PR description for more detail.
// ---------------------------------------------------------------------------

interface AttestationListProps {
  /** Fetched server-side (see AttestationListServer) so it's available on first paint. */
  initialAttestations: AttestationDto[];
}

export function AttestationList({ initialAttestations }: AttestationListProps) {
  const [attestations, setAttestations] = useState<AttestationDto[]>(initialAttestations);
  const [revalidating, setRevalidating] = useState<Set<string>>(new Set());
  // Captured via ref (not a dependency) so the mount effect below runs
  // exactly once against the server-provided rows, the same way
  // WalletConnect captures onConnected via a ref instead of a dependency.
  const initialAttestationsRef = useRef(initialAttestations);

  useEffect(() => {
    let ignore = false;

    async function revalidateAll(rows: AttestationDto[]) {
      const stellarConfig = getStellarConfig();
      const contractConfig = getContractConfig();

      await Promise.all(
        rows.map(async (row) => {
          let onChainValid: boolean;
          try {
            onChainValid = await isValidAttestation(
              row.attestationId,
              stellarConfig,
              contractConfig
            );
          } catch {
            // RPC failure here shouldn't break the page — the DB-indexed
            // status is still shown, just unconfirmed for this load.
            return;
          }
          if (ignore || !hasStatusDiscrepancy(row.status, onChainValid)) return;

          setRevalidating((prev) => new Set(prev).add(row.attestationId));
          try {
            const res = await fetch(`/api/attestations/${row.attestationId}/resync`, {
              method: "POST",
            });
            if (!res.ok) return;
            const json = (await res.json()) as {
              data: { attestation: { status: "Active" | "Revoked" } } | null;
            };
            const newStatus = json.data?.attestation.status;
            if (ignore || !newStatus) return;
            setAttestations((prev) =>
              prev.map((a) =>
                a.attestationId === row.attestationId ? { ...a, status: newStatus } : a
              )
            );
          } finally {
            if (!ignore) {
              setRevalidating((prev) => {
                const next = new Set(prev);
                next.delete(row.attestationId);
                return next;
              });
            }
          }
        })
      );
    }

    void revalidateAll(initialAttestationsRef.current);
    return () => {
      ignore = true;
    };
  }, []);

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
            <span style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              {revalidating.has(att.attestationId) && (
                <span style={{ fontSize: "0.75rem", color: "var(--muted)" }} role="status">
                  Re-checking…
                </span>
              )}
              <StatusBadge status={att.status} />
            </span>
          </div>
          <dl style={{ fontSize: "0.875rem", color: "var(--muted)", margin: 0 }}>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <dt style={{ fontWeight: 500, minWidth: "80px" }}>Claim</dt>
              <dd style={att.claimDescription ? undefined : { fontFamily: "monospace" }}>
                {att.claimDescription ?? (att.claimHash ? `${att.claimHash.slice(0, 16)}…` : "—")}
              </dd>
            </div>
            <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.25rem" }}>
              <dt style={{ fontWeight: 500, minWidth: "80px" }}>Attester</dt>
              <dd
                style={{ fontFamily: "monospace", wordBreak: "break-all" }}
                title={att.attesterAddress}
              >
                {resolveAttesterName(att.attesterAddress)}
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
