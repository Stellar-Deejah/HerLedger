interface FormFieldProps {
  id: string;
  label: string;
  type: "text" | "email" | "password";
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  autoComplete?: string;
  description?: string;
  error?: string;
}

export function FormField({
  id,
  label,
  type,
  value,
  onChange,
  required,
  autoComplete,
  description,
  error,
}: FormFieldProps) {
  const descId = description ? `${id}-desc` : undefined;
  const errId = error ? `${id}-error` : undefined;
  const ariaDescribedBy = [descId, errId].filter(Boolean).join(" ") || undefined;

  return (
    <div style={{ marginBottom: "1rem" }}>
      <label
        htmlFor={id}
        style={{
          display: "block",
          fontWeight: 500,
          fontSize: "0.875rem",
          marginBottom: "0.375rem",
        }}
      >
        {label}
        {required && (
          <span aria-hidden="true" style={{ color: "var(--danger)", marginLeft: "0.25rem" }}>
            *
          </span>
        )}
      </label>

      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        autoComplete={autoComplete}
        aria-describedby={ariaDescribedBy}
        aria-invalid={error ? true : undefined}
        style={{
          width: "100%",
          padding: "0.5rem 0.75rem",
          border: `1px solid ${error ? "var(--danger)" : "var(--border)"}`,
          borderRadius: "var(--radius)",
          fontSize: "1rem",
          background: "var(--background)",
          color: "var(--foreground)",
          boxSizing: "border-box",
        }}
      />

      {description && !error && (
        <p
          id={descId}
          style={{ fontSize: "0.8125rem", color: "var(--muted)", marginTop: "0.25rem" }}
        >
          {description}
        </p>
      )}
      {error && (
        <p
          id={errId}
          role="alert"
          style={{ fontSize: "0.8125rem", color: "var(--danger)", marginTop: "0.25rem" }}
        >
          {error}
        </p>
      )}
    </div>
  );
}
