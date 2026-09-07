"use client";

import type { EventStatus, AttestationStatus } from "@herledger/sdk";
import { useTranslations } from "next-intl";

export type Status = EventStatus | AttestationStatus;

const STATUS_STYLES: Record<Status, { background: string; color: string }> = {
  Pending: {
    background: "var(--color-warning-bg)",
    color: "var(--color-warning-text)",
  },
  Verified: {
    background: "var(--color-success-bg)",
    color: "var(--color-success-text)",
  },
  Disputed: {
    background: "var(--color-disputed-bg)",
    color: "var(--color-disputed-text)",
  },
  Revoked: {
    background: "var(--color-error-bg)",
    color: "var(--color-error-text)",
  },
  Active: {
    background: "var(--color-success-bg)",
    color: "var(--color-success-text)",
  },
};

export interface StatusBadgeProps {
  /** The current ledger event status or attestation status */
  status: Status;
}

/**
 * StatusBadge renders a pill badge representing the state of an event or attestation.
 * Uses semantic color tokens (Warning, Success, Disputed, Error) and the active
 * locale's message catalog for the status label.
 */
export function StatusBadge({ status }: StatusBadgeProps) {
  const t = useTranslations("ui");

  const style = STATUS_STYLES[status] ?? {
    background: "var(--color-muted-bg)",
    color: "var(--color-muted-text)",
  };
  const label = status in STATUS_STYLES ? t(`status.${status}`) : status;

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
      aria-label={t("statusAria", { status: label })}
    >
      {label}
    </span>
  );
}
