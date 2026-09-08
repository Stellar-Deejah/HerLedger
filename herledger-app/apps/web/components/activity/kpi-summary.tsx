import type React from "react";

import type { ActivitySummaryData } from "@/app/api/v1/activity/summary/schema";
import { formatAmount } from "@/lib/utils/format";

interface KpiSummaryProps {
  summary: ActivitySummaryData;
}

const CARD_STYLE: React.CSSProperties = {
  flex: "1 1 160px",
  padding: "var(--spacing-lg)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
};

const LABEL_STYLE: React.CSSProperties = {
  fontSize: "var(--font-size-xs)",
  color: "var(--muted)",
  marginBottom: "var(--spacing-xs)",
};

const VALUE_STYLE: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: "var(--font-size-lg)",
  fontWeight: "var(--font-weight-semibold)",
};

/**
 * Financial KPI cards: total received, total sent, net balance, and event
 * counts by status. Combined across every asset the business supports --
 * there's no per-asset breakdown here, matching the flat shape the summary
 * endpoint returns (see FinancialEventsSummary in @herledger/db).
 */
export function KpiSummary({ summary }: KpiSummaryProps) {
  const netBalance = BigInt(summary.netBalance);
  const netBalanceColor = netBalance < 0n ? "var(--color-error-text)" : "var(--color-success-text)";

  const statusEntries = Object.entries(summary.countByStatus) as Array<
    [keyof typeof summary.countByStatus, number]
  >;

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: "var(--spacing-lg)",
        marginBottom: "var(--spacing-xl)",
      }}
      aria-label="Financial summary"
    >
      <div style={CARD_STYLE}>
        <div style={LABEL_STYLE}>Total received</div>
        <div style={VALUE_STYLE}>{formatAmount(BigInt(summary.totalReceived))}</div>
      </div>
      <div style={CARD_STYLE}>
        <div style={LABEL_STYLE}>Total sent</div>
        <div style={VALUE_STYLE}>{formatAmount(BigInt(summary.totalSent))}</div>
      </div>
      <div style={CARD_STYLE}>
        <div style={LABEL_STYLE}>Net balance</div>
        <div style={{ ...VALUE_STYLE, color: netBalanceColor }}>
          {formatAmount(netBalance < 0n ? -netBalance : netBalance)}
          {netBalance < 0n ? " (deficit)" : ""}
        </div>
      </div>
      <div style={CARD_STYLE}>
        <div style={LABEL_STYLE}>Events by status</div>
        <div style={{ display: "flex", gap: "var(--spacing-md)", flexWrap: "wrap" }}>
          {statusEntries.map(([status, count]) => (
            <span key={status} style={{ fontSize: "var(--font-size-sm)" }}>
              <strong>{count}</strong> {status.toLowerCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
