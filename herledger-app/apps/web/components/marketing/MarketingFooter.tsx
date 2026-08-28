import Link from "next/link";

export function MarketingFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--background)",
        padding: "3rem 1.5rem",
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: "1.5rem",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: "2rem",
            flexWrap: "wrap",
            fontSize: "0.875rem",
          }}
        >
          <Link
            href="/auth/sign-in"
            style={{ color: "var(--color-muted-text)", textDecoration: "none" }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            style={{ color: "var(--color-muted-text)", textDecoration: "none" }}
          >
            Register
          </Link>
          <Link
            href="#features"
            style={{ color: "var(--color-muted-text)", textDecoration: "none" }}
          >
            Features
          </Link>
          <Link
            href="/dashboard"
            style={{ color: "var(--color-muted-text)", textDecoration: "none" }}
          >
            Dashboard
          </Link>
        </div>

        <p
          style={{
            margin: 0,
            fontSize: "0.8125rem",
            color: "var(--color-muted-text)",
            lineHeight: 1.5,
            maxWidth: "700px",
            alignSelf: "center",
          }}
        >
          Disclaimer: HerLedger is a verifiable transaction indexing and cryptographic attestation
          protocol on Stellar. HerLedger does not issue loans, calculate credit scores, or make
          lending decisions.
        </p>

        <div style={{ fontSize: "0.75rem", color: "var(--color-muted-text)" }}>
          &copy; {new Date().getFullYear()} HerLedger. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
