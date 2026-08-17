"use client";

import { useEffect, useState } from "react";
import { ErrorMessage } from "@/components/ui/error-message";

// ---------------------------------------------------------------------------
// Personal Access Tokens settings section.
// Lets a business issue a long-lived Bearer token for third-party tools to
// read its financial events from the indexer API. The plaintext value is
// shown exactly once, immediately after creation.
// ---------------------------------------------------------------------------

interface TokenSummary {
  id: string;
  name: string;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revokedAt: string | null;
}

async function fetchJson<T>(input: string, init?: RequestInit) {
  const res = await fetch(input, init);
  return (await res.json()) as { data: T | null; error: { code: string; message: string } | null };
}

export function PersonalAccessTokens() {
  const [tokens, setTokens] = useState<TokenSummary[] | null>(null);
  const [name, setName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newlyCreatedToken, setNewlyCreatedToken] = useState<string | null>(null);

  async function load() {
    const { data } = await fetchJson<{ tokens: TokenSummary[] }>("/api/settings/tokens");
    setTokens(data?.tokens ?? []);
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setCreating(true);

    const { data, error: err } = await fetchJson<{ id: string; token: string }>(
      "/api/settings/tokens",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      }
    );

    setCreating(false);
    if (err || !data) {
      setError(err?.message ?? "Failed to create token");
      return;
    }

    setNewlyCreatedToken(data.token);
    setName("");
    await load();
  }

  async function handleRevoke(id: string) {
    setError(null);
    const { error: err } = await fetchJson(`/api/settings/tokens/${id}`, { method: "DELETE" });
    if (err) {
      setError(err.message);
      return;
    }
    await load();
  }

  return (
    <div>
      {error && <ErrorMessage message={error} />}

      {newlyCreatedToken && (
        <div
          role="alert"
          style={{
            padding: "0.875rem",
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: "var(--radius)",
            marginBottom: "1rem",
          }}
        >
          <p style={{ fontSize: "0.875rem", fontWeight: 500, marginBottom: "0.5rem" }}>
            Copy this token now — it will not be shown again.
          </p>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "0.8125rem",
              wordBreak: "break-all",
              userSelect: "all",
            }}
          >
            {newlyCreatedToken}
          </p>
          <button
            type="button"
            onClick={() => setNewlyCreatedToken(null)}
            style={{
              marginTop: "0.5rem",
              background: "none",
              border: "none",
              color: "var(--muted)",
              fontSize: "0.8125rem",
              cursor: "pointer",
              padding: 0,
            }}
          >
            Dismiss
          </button>
        </div>
      )}

      <form
        onSubmit={(e) => void handleCreate(e)}
        style={{ display: "flex", gap: "0.5rem", marginBottom: "1.5rem" }}
      >
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Token name (e.g. QuickBooks sync)"
          required
          aria-label="New token name"
          style={{
            flex: 1,
            padding: "0.5rem 0.75rem",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            fontSize: "0.9375rem",
            background: "var(--background)",
            color: "var(--foreground)",
          }}
        />
        <button
          type="submit"
          disabled={creating}
          style={{
            padding: "0.5rem 1rem",
            background: creating ? "var(--muted)" : "var(--primary)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius)",
            fontSize: "0.875rem",
            fontWeight: 500,
            cursor: creating ? "not-allowed" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {creating ? "Creating…" : "Create token"}
        </button>
      </form>

      {tokens === null ? (
        <p style={{ color: "var(--muted)" }}>Loading…</p>
      ) : tokens.length === 0 ? (
        <p style={{ color: "var(--muted)", fontSize: "0.9375rem" }}>
          No personal access tokens yet.
        </p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {tokens.map((token) => (
            <li
              key={token.id}
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "0.625rem 0",
                borderBottom: "1px solid var(--border)",
              }}
            >
              <div>
                <p style={{ fontSize: "0.9375rem", fontWeight: 500 }}>{token.name}</p>
                <p
                  style={{ fontFamily: "monospace", fontSize: "0.8125rem", color: "var(--muted)" }}
                >
                  {token.prefix}…{token.revokedAt && " (revoked)"}
                </p>
              </div>
              {!token.revokedAt && (
                <button
                  type="button"
                  onClick={() => void handleRevoke(token.id)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "0.375rem 0.75rem",
                    cursor: "pointer",
                    fontSize: "0.8125rem",
                    color: "var(--danger)",
                  }}
                >
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      <p style={{ marginTop: "1rem", fontSize: "0.8125rem", color: "var(--muted)" }}>
        Personal access tokens authenticate read-only requests to the indexer API. Send them as{" "}
        <code>Authorization: Bearer &lt;token&gt;</code>. See the README for details.
      </p>
    </div>
  );
}
