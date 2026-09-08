"use client";

import { useTranslations } from "next-intl";

export interface LoadingSpinnerProps {
  /** Screen reader accessible label describing what is loading */
  label?: string;
}

/**
 * LoadingSpinner renders an accessible CSS-animated spinning indicator using brand tokens.
 * Defaults to the active locale's "Loading…" message when no label is provided.
 */
export function LoadingSpinner({ label }: LoadingSpinnerProps) {
  const t = useTranslations("ui");
  const resolvedLabel = label ?? t("loading");

  return (
    <div
      role="status"
      aria-label={resolvedLabel}
      style={{ display: "flex", justifyContent: "center", padding: "var(--spacing-2xl)" }}
    >
      <span
        style={{
          width: "1.5rem",
          height: "1.5rem",
          border: "2px solid var(--border)",
          borderTopColor: "var(--color-brand)",
          borderRadius: "var(--radius-full)",
          display: "inline-block",
          animation: "spin 0.75s linear infinite",
        }}
      />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <span className="sr-only">{resolvedLabel}</span>
    </div>
  );
}
