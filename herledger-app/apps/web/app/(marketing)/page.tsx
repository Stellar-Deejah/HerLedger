import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HerLedger — Verifiable Financial History for Women-Owned Businesses",
};

export default function HomePage() {
  return (
    <main>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "1.125rem" }}>HerLedger</span>
        <nav aria-label="Main navigation">
          <Link href="/auth/sign-in" style={{ marginRight: "1rem" }}>
            Sign in
          </Link>
          <Link href="/auth/sign-up">Get started</Link>
        </nav>
      </header>

      <section
        style={{
          maxWidth: "640px",
          margin: "6rem auto",
          padding: "0 2rem",
          textAlign: "center",
        }}
      >
        <h1
          style={{
            fontSize: "2.25rem",
            fontWeight: 700,
            lineHeight: 1.2,
            marginBottom: "1.25rem",
          }}
        >
          Build a verifiable financial history for your business
        </h1>
        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--muted)",
            marginBottom: "2rem",
            lineHeight: 1.6,
          }}
        >
          HerLedger records recognized Stellar transactions and verified attestations so your
          business can build a portable, auditable financial history — without sharing unnecessary
          private information.
        </p>
        <Link
          href="/auth/sign-up"
          style={{
            display: "inline-block",
            background: "var(--primary)",
            color: "#fff",
            padding: "0.75rem 1.5rem",
            borderRadius: "var(--radius)",
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          Register your business
        </Link>
      </section>

      <section
        style={{
          maxWidth: "800px",
          margin: "0 auto 6rem",
          padding: "0 2rem",
        }}
      >
        <h2
          style={{
            fontSize: "1.25rem",
            fontWeight: 600,
            marginBottom: "2rem",
            textAlign: "center",
          }}
        >
          What HerLedger does
        </h2>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem",
          }}
        >
          {[
            "Records recognized Stellar payment activity",
            "Tracks payment received and payment sent",
            "Links verified attestations to financial events",
            "Preserves disputed and revoked history",
            "Keeps private metadata off-chain",
            "Gives you a portable financial record",
          ].map((item) => (
            <li
              key={item}
              style={{
                padding: "1rem",
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                fontSize: "0.9375rem",
                lineHeight: 1.5,
              }}
            >
              {item}
            </li>
          ))}
        </ul>
        <p
          style={{
            marginTop: "2rem",
            color: "var(--muted)",
            fontSize: "0.875rem",
            textAlign: "center",
          }}
        >
          HerLedger does not issue loans, calculate credit scores, or make lending decisions.
        </p>
      </section>
    </main>
  );
}
