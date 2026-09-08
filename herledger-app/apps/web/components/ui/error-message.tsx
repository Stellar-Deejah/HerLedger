export interface ErrorMessageProps {
  /** Error text displayed to the user */
  message: string;
  /** Optional id so callers can wire this message to a control via aria-describedby */
  id?: string | undefined;
}

/**
 * ErrorMessage displays a prominent alert banner for form-level or action-level errors.
 * Uses the shared `--color-error-*` semantic token palette matching StatusBadge's Revoked state.
 */
export function ErrorMessage({ message, id }: ErrorMessageProps) {
  return (
    <div
      id={id}
      role="alert"
      style={{
        padding: "var(--spacing-md)",
        background: "var(--color-error-bg)",
        border: "1px solid var(--color-error-border)",
        borderRadius: "var(--radius-md)",
        color: "var(--color-error-text)",
        fontSize: "var(--font-size-sm)",
        marginBottom: "var(--spacing-lg)",
      }}
    >
      {message}
    </div>
  );
}
