export interface LoadingSpinnerProps {
  /** Screen reader accessible label describing what is loading */
  label?: string;
}

/**
 * LoadingSpinner renders an accessible CSS-animated spinning indicator using brand tokens.
 */
export function LoadingSpinner({ label = "Loading…" }: LoadingSpinnerProps) {
  return (
    <div
      role="status"
      aria-label={label}
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
      <span className="sr-only">{label}</span>
    </div>
  );
}
