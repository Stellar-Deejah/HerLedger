"use client";

import { useEffect, useState } from "react";
import { ErrorMessage } from "@/components/ui/error-message";

// ---------------------------------------------------------------------------
// Notification Preferences settings section.
// Infrastructure for a future notification system — toggles are saved, but
// nothing dispatches a notification yet.
// ---------------------------------------------------------------------------

type NotificationEventType = "NewAttestation" | "DisputeResolution" | "BusinessDeactivation";

interface Preference {
  eventType: NotificationEventType;
  email: boolean;
  inApp: boolean;
}

const EVENT_LABELS: Record<NotificationEventType, string> = {
  NewAttestation: "New attestation on one of your events",
  DisputeResolution: "A dispute you raised is resolved",
  BusinessDeactivation: "Your business is deactivated",
};

async function fetchJson<T>(input: string, init?: RequestInit) {
  const res = await fetch(input, init);
  return (await res.json()) as { data: T | null; error: { code: string; message: string } | null };
}

export function NotificationPreferences() {
  const [preferences, setPreferences] = useState<Preference[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    void (async () => {
      const { data } = await fetchJson<{ preferences: Preference[] }>(
        "/api/settings/notifications"
      );
      setPreferences(data?.preferences ?? []);
    })();
  }, []);

  function toggle(eventType: NotificationEventType, channel: "email" | "inApp") {
    setSaved(false);
    setPreferences((prev) =>
      (prev ?? []).map((p) => (p.eventType === eventType ? { ...p, [channel]: !p[channel] } : p))
    );
  }

  async function handleSave() {
    if (!preferences) return;
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: err } = await fetchJson("/api/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ preferences }),
    });

    setSaving(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSaved(true);
  }

  if (!preferences) {
    return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  }

  return (
    <div>
      {error && <ErrorMessage message={error} />}

      <table style={{ width: "100%", fontSize: "0.9375rem", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ textAlign: "left", borderBottom: "1px solid var(--border)" }}>
            <th style={{ paddingBottom: "0.5rem", fontWeight: 500, color: "var(--muted)" }}>
              Event
            </th>
            <th
              style={{
                paddingBottom: "0.5rem",
                fontWeight: 500,
                color: "var(--muted)",
                textAlign: "center",
              }}
            >
              Email
            </th>
            <th
              style={{
                paddingBottom: "0.5rem",
                fontWeight: 500,
                color: "var(--muted)",
                textAlign: "center",
              }}
            >
              In-app
            </th>
          </tr>
        </thead>
        <tbody>
          {preferences.map((pref) => (
            <tr key={pref.eventType} style={{ borderBottom: "1px solid var(--border)" }}>
              <td style={{ padding: "0.625rem 0" }}>{EVENT_LABELS[pref.eventType]}</td>
              <td style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={pref.email}
                  onChange={() => toggle(pref.eventType, "email")}
                  aria-label={`Email notifications for: ${EVENT_LABELS[pref.eventType]}`}
                />
              </td>
              <td style={{ textAlign: "center" }}>
                <input
                  type="checkbox"
                  checked={pref.inApp}
                  onChange={() => toggle(pref.eventType, "inApp")}
                  aria-label={`In-app notifications for: ${EVENT_LABELS[pref.eventType]}`}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={saving}
        style={{
          marginTop: "1rem",
          padding: "0.5rem 1rem",
          background: saving ? "var(--muted)" : "var(--primary)",
          color: "#fff",
          border: "none",
          borderRadius: "var(--radius)",
          fontSize: "0.875rem",
          fontWeight: 500,
          cursor: saving ? "not-allowed" : "pointer",
        }}
      >
        {saving ? "Saving…" : "Save preferences"}
      </button>
      {saved && (
        <span style={{ marginLeft: "0.75rem", fontSize: "0.875rem", color: "var(--muted)" }}>
          Saved.
        </span>
      )}
    </div>
  );
}
