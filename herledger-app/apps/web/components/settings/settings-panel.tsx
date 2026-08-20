"use client";

import { useSession, signOut } from "@/lib/auth/client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export function SettingsPanel() {
  const { data: session } = useSession();
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsDeleting(true);

    try {
      const res = await fetch("/api/user/account", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete account");
      }

      await signOut();
      router.push("/");
    } catch (err: any) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div>
      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>Account</h2>
        {session ? (
          <dl style={{ fontSize: "0.9375rem" }}>
            <div style={{ display: "flex", gap: "0.75rem", marginBottom: "0.5rem" }}>
              <dt style={{ color: "var(--muted)", minWidth: "80px" }}>Name</dt>
              <dd>{session.user.name ?? "—"}</dd>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <dt style={{ color: "var(--muted)", minWidth: "80px" }}>Email</dt>
              <dd>{session.user.email}</dd>
            </div>
          </dl>
        ) : (
          <p style={{ color: "var(--muted)" }}>Loading…</p>
        )}
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>Privacy</h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9375rem", lineHeight: 1.6 }}>
          Stellar transaction data is publicly visible on the Stellar blockchain. HerLedger
          minimizes additional personal information stored on-chain. Private application metadata —
          such as your business name and contact details — remains off-chain and is not published to
          any blockchain. Only cryptographic hashes are committed on-chain for integrity
          verification.
        </p>
        <p
          style={{
            color: "var(--muted)",
            fontSize: "0.875rem",
            marginTop: "0.75rem",
            lineHeight: 1.6,
          }}
        >
          HerLedger does not claim that your Stellar wallet balance or transaction history is
          private. Blockchain transactions are public.
        </p>
      </section>

      <section
        style={{
          border: "1px solid var(--destructive)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.125rem",
            fontWeight: 600,
            marginBottom: "0.75rem",
            color: "var(--destructive)",
          }}
        >
          Danger Zone
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9375rem", marginBottom: "1rem" }}>
          Once you delete your account, there is no going back. Please be certain.
        </p>

        {!showConfirm ? (
          <button
            onClick={() => setShowConfirm(true)}
            style={{
              padding: "0.5rem 1rem",
              backgroundColor: "var(--destructive)",
              color: "white",
              borderRadius: "var(--radius)",
              border: "none",
              cursor: "pointer",
            }}
          >
            Delete Account
          </button>
        ) : (
          <form
            onSubmit={handleDelete}
            style={{ display: "flex", flexDirection: "column", gap: "1rem", maxWidth: "400px" }}
          >
            <div
              style={{
                padding: "1rem",
                backgroundColor: "var(--destructive-foreground)",
                borderRadius: "var(--radius)",
              }}
            >
              <p style={{ fontWeight: 500, marginBottom: "0.5rem" }}>
                Are you sure you want to delete your account?
              </p>
              <p style={{ fontSize: "0.875rem", color: "var(--muted)" }}>
                This will revoke all active sessions and anonymize your personal data immediately.
                Hard deletion will occur after a 30-day grace period.
              </p>
            </div>

            <div>
              <label
                htmlFor="password"
                style={{ display: "block", marginBottom: "0.5rem", fontSize: "0.875rem" }}
              >
                Confirm Password
              </label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  width: "100%",
                  padding: "0.5rem",
                  borderRadius: "var(--radius)",
                  border: "1px solid var(--border)",
                  backgroundColor: "var(--background)",
                }}
              />
            </div>

            {error && <p style={{ color: "var(--destructive)", fontSize: "0.875rem" }}>{error}</p>}

            <div style={{ display: "flex", gap: "1rem" }}>
              <button
                type="button"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "transparent",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isDeleting || !password}
                style={{
                  padding: "0.5rem 1rem",
                  backgroundColor: "var(--destructive)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius)",
                  cursor: isDeleting || !password ? "not-allowed" : "pointer",
                  opacity: isDeleting || !password ? 0.7 : 1,
                }}
              >
                {isDeleting ? "Deleting..." : "Confirm Deletion"}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
