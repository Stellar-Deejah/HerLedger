"use client";

import { useTranslations } from "next-intl";

export interface SubmitButtonProps {
  /** Button label or nested elements */
  children: React.ReactNode;
  /** When true, renders in a busy state with loading text */
  loading?: boolean;
  /** When true, disables submission */
  disabled?: boolean;
}

/**
 * SubmitButton provides a standardized full-width submit button with built-in loading state management
 * and accessible ARIA busy attributes.
 */
export function SubmitButton({ children, loading, disabled }: SubmitButtonProps) {
  const t = useTranslations("ui");
  const isInactive = loading || disabled;

  return (
    <button
      type="submit"
      disabled={isInactive}
      aria-busy={loading}
      style={{
        width: "100%",
        padding: "0.625rem var(--spacing-lg)",
        background: isInactive ? "var(--color-muted-text)" : "var(--color-brand)",
        color: "#ffffff",
        border: "none",
        borderRadius: "var(--radius-md)",
        fontSize: "var(--font-size-base)",
        fontWeight: "var(--font-weight-medium)",
        cursor: isInactive ? "not-allowed" : "pointer",
        marginTop: "var(--spacing-sm)",
      }}
    >
      {loading ? t("pleaseWait") : children}
    </button>
  );
}
