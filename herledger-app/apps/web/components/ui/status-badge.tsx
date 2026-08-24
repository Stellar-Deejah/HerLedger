import type { EventStatus, AttestationStatus } from "@herledger/sdk";

export type Status = EventStatus | AttestationStatus;

const STATUS_STYLES: Record<Status, { background: string; color: string; label: string }> = {
  Pending: {
    background: "var(--color-warning-bg)",
    color: "var(--color-warning-text)",
    label: "Pending",
  },
  Verified: {
    background: "var(--color-success-bg)",
    color: "var(--color-success-text)",
    label: "Verified",
  },
  Disputed: {
    background: "var(--color-disputed-bg)",
    color: "var(--color-disputed-text)",
    label: "Disputed",
  },
  Revoked: {
    background: "var(--color-error-bg)",
    color: "var(--color-error-text)",
    label: "Revoked",
  },
  Active: {
    background: "var(--color-success-bg)",
    color: "var(--color-success-text)",
    label: "Active",
  },
};

export interface StatusBadgeProps {
  /** The current ledger event status or attestation status */
  status: Status;
}

/**
 * StatusBadge renders a pill badge representing the state of an event or attestation.
 * Uses semantic color tokens (Warning, Success, Disputed, Error).
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const style = STATUS_STYLES[status] ?? {
    background: "var(--color-muted-bg)",
    color: "var(--color-muted-text)",
    label: status,
  };

  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.125rem var(--spacing-sm)",
        borderRadius: "var(--radius-full)",
        fontSize: "var(--font-size-xs)",
        fontWeight: "var(--font-weight-medium)",
        background: style.background,
        color: style.color,
      }}
      aria-label={`Status: ${style.label}`}
    >
      {style.label}
    </span>
  );
}
