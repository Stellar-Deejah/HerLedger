import type { CSSProperties } from "react";

import { EmptyState } from "@/components/ui/empty-state";
import { StatusBadge } from "@/components/ui/status-badge";
import type { FinancialEventDetail } from "@/lib/data/activity-detail";
import { DISPUTE_STATUS_LABELS } from "@/lib/disputes/status";
import { formatAmount, truncateAddress } from "@/lib/utils/format";

export interface FinancialEventDetailProps {
  detail: FinancialEventDetail;
}

const rowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: "1rem",
  padding: "0.5rem 0",
  borderBottom: "1px solid var(--border)",
};

const labelStyle: CSSProperties = {
  color: "var(--color-muted-text)",
  fontSize: "var(--font-size-sm)",
};

const valueStyle: CSSProperties = {
  fontFamily: "monospace",
  fontSize: "var(--font-size-sm)",
  textAlign: "right",
  wordBreak: "break-all",
};

function sectionTitleStyle(): CSSProperties {
  return { fontSize: "1.125rem", fontWeight: 600, margin: "2rem 0 0.75rem" };
}

function formatDateTime(value: Date): string {
  return new Date(value).toLocaleString();
}

/**
 * Renders a single financial event's full detail: every stored field,
 * attestations, dispute history, and an outbound link to Stellar Expert.
 * Pure presentational Server Component -- no interactivity, so no
 * "use client" -- receives already-fetched, already-ownership-checked data.
 */
export function FinancialEventDetail({ detail }: FinancialEventDetailProps) {
  const { event, attestations, disputes, stellarTransaction } = detail;

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>{formatEventType(event.eventType)}</h1>
        <StatusBadge status={event.status} />
      </div>

      <div style={{ border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: "1rem" }}>
        <div style={rowStyle}>
          <span style={labelStyle}>Event ID</span>
          <span style={valueStyle}>{event.eventId}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Amount</span>
          <span style={valueStyle}>{formatAmount(BigInt(event.amount))}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Asset address</span>
          <span style={valueStyle}>{truncateAddress(event.assetAddress)}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Ledger sequence</span>
          <span style={valueStyle}>{event.ledgerSequence}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Metadata hash</span>
          <span style={valueStyle}>{truncateAddress(event.metadataHash)}</span>
        </div>
        <div style={rowStyle}>
          <span style={labelStyle}>Created</span>
          <span style={valueStyle}>{formatDateTime(event.createdAt)}</span>
        </div>
        <div style={{ ...rowStyle, borderBottom: "none" }}>
          <span style={labelStyle}>Updated</span>
          <span style={valueStyle}>{formatDateTime(event.updatedAt)}</span>
        </div>
      </div>

      <div style={{ marginTop: "1rem" }}>
        <a
          href={`https://stellar.expert/explorer/testnet/tx/${event.stellarReference}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          View on Stellar Expert
        </a>
        {stellarTransaction && (
          <span style={{ ...labelStyle, marginLeft: "0.75rem" }}>
            {stellarTransaction.successful ? "Successful" : "Failed"} · ledger{" "}
            {stellarTransaction.ledgerSequence}
          </span>
        )}
      </div>

      <h2 style={sectionTitleStyle()}>Attestations</h2>
      {attestations.length === 0 ? (
        <EmptyState title="No attestations for this event." />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {attestations.map((a) => (
            <li
              key={a.id}
              style={{
                border: "1px solid var(--border)",
                borderRadius: "var(--radius-md)",
                padding: "0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <span style={valueStyle}>{truncateAddress(a.attesterAddress)}</span>
                <StatusBadge status={a.status} />
              </div>
              {a.claimDescription && <p style={{ margin: "0.25rem 0 0" }}>{a.claimDescription}</p>}
              <p style={{ ...labelStyle, margin: "0.25rem 0 0" }}>
                Ledger {a.ledgerSequence} · {formatDateTime(a.createdAt)}
              </p>
            </li>
          ))}
        </ul>
      )}

      <h2 style={sectionTitleStyle()}>Dispute history</h2>
      {disputes.length === 0 ? (
        <EmptyState title="No disputes have been raised for this event." />
      ) : (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {disputes.map((d) => {
            const style = DISPUTE_STATUS_LABELS[d.status];
            return (
              <li
                key={d.id}
                style={{
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius-md)",
                  padding: "0.75rem",
                  marginBottom: "0.5rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.125rem var(--spacing-sm)",
                      borderRadius: "var(--radius-full)",
                      fontSize: "var(--font-size-xs)",
                      fontWeight: "var(--font-weight-medium)",
                      background: style?.background ?? "var(--color-muted-bg)",
                      color: style?.color ?? "var(--color-muted-text)",
                    }}
                  >
                    {style?.label ?? d.status}
                  </span>
                  <span style={labelStyle}>{formatDateTime(d.submittedAt)}</span>
                </div>
                <p style={{ margin: "0.25rem 0" }}>{d.reason}</p>
                {d.resolvedAt && (
                  <p style={{ ...labelStyle, margin: "0.25rem 0 0" }}>
                    Resolved {formatDateTime(d.resolvedAt)}
                    {d.resolutionTxHash && ` · tx ${truncateAddress(d.resolutionTxHash)}`}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
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
