export interface EmptyStateProps {
  /** Main heading describing the empty state */
  title: string;
  /** Optional secondary description explaining next steps or context */
  description?: string;
}

/**
 * EmptyState renders a visually distinct placeholder container with a dashed border
 * when a list, table, or query has no records to display.
 */
export function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "var(--spacing-3xl) var(--spacing-2xl)",
        border: "1px dashed var(--border)",
        borderRadius: "var(--radius-md)",
        color: "var(--color-muted-text)",
      }}
    >
      <p style={{ fontWeight: "var(--font-weight-medium)", marginBottom: description ? "var(--spacing-sm)" : 0 }}>
        {title}
      </p>
      {description && (
        <p style={{ fontSize: "var(--font-size-sm)", margin: 0 }}>
          {description}
        </p>
      )}
    </div>
  );
}
