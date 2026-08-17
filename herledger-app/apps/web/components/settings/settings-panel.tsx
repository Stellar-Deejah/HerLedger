"use client";

import { useSession } from "@/lib/auth/client";
import { LinkedWallet } from "./linked-wallet";
import { NotificationPreferences } from "./notification-preferences";
import { PersonalAccessTokens } from "./personal-access-tokens";

export function SettingsPanel() {
  const { data: session } = useSession();

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
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
          Linked Wallet
        </h2>
        <LinkedWallet />
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
          Notification Preferences
        </h2>
        <NotificationPreferences />
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
          marginBottom: "1.5rem",
        }}
      >
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
          Personal Access Tokens
        </h2>
        <PersonalAccessTokens />
      </section>

      <section
        style={{
          border: "1px solid var(--border)",
          borderRadius: "var(--radius)",
          padding: "1.5rem",
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
    </div>
  );
}
