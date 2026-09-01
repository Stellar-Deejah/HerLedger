"use client";

import { useMemo } from "react";

import { scorePassword, STRENGTH_LABELS } from "@/lib/auth/password-strength";

const SEGMENT_COLORS = [
  "var(--color-error)",
  "var(--color-error)",
  "var(--color-warning, #d97706)",
  "var(--color-success, #16a34a)",
  "var(--color-success, #16a34a)",
];

export interface PasswordStrengthMeterProps {
  password: string;
  /** Values (e.g. name, email) zxcvbn should penalize if reused in the password. */
  userInputs?: string[];
}

/**
 * Real-time password strength indicator for sign-up-form.tsx. Renders
 * nothing for an empty password -- there's nothing meaningful to score yet,
 * and an always-visible "Very weak" bar in front of an untouched field
 * reads as an error before the user has done anything.
 */
export function PasswordStrengthMeter({ password, userInputs = [] }: PasswordStrengthMeterProps) {
  const strength = useMemo(() => scorePassword(password, userInputs), [password, userInputs]);

  if (password.length === 0) return null;

  return (
    <div style={{ marginTop: "0.5rem", marginBottom: "1rem" }}>
      <div style={{ display: "flex", gap: "0.25rem" }} aria-hidden="true">
        {STRENGTH_LABELS.map((_, i) => (
          <div
            key={i}
            style={{
              height: "0.25rem",
              flex: 1,
              borderRadius: "var(--radius-full)",
              background: i <= strength.score ? SEGMENT_COLORS[strength.score] : "var(--border)",
            }}
          />
        ))}
      </div>
      <p
        role="status"
        aria-live="polite"
        style={{
          fontSize: "0.8125rem",
          color: "var(--color-muted-text)",
          marginTop: "0.375rem",
          marginBottom: 0,
        }}
      >
        Password strength: {strength.label}
        {strength.suggestions.length > 0 && ` — ${strength.suggestions.join(" ")}`}
      </p>
    </div>
  );
}
