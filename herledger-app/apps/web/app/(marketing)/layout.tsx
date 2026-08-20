import Image from "next/image";
import Link from "next/link";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          borderBottom: "1px solid var(--border)",
          background: "var(--background)",
          padding: "1rem 2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <Link
          href="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            textDecoration: "none",
            color: "var(--foreground)",
          }}
        >
          <Image
            src="/images/logo.svg"
            alt="HerLedger Logo"
            width={36}
            height={36}
            priority
            sizes="36px"
          />
          <span style={{ fontWeight: 800, fontSize: "1.25rem", letterSpacing: "-0.01em" }}>
            HerLedger
          </span>
        </Link>
        <nav
          aria-label="Main navigation"
          style={{ display: "flex", alignItems: "center", gap: "1rem" }}
        >
          <Link
            href="/auth/sign-in"
            style={{
              fontWeight: 500,
              fontSize: "0.9375rem",
              textDecoration: "none",
              color: "var(--color-muted-text)",
            }}
          >
            Sign in
          </Link>
          <Link
            href="/auth/sign-up"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              background: "var(--primary)",
              color: "#ffffff",
              padding: "0.5rem 1.125rem",
              borderRadius: "var(--radius-sm)",
              fontWeight: 600,
              fontSize: "0.875rem",
              textDecoration: "none",
            }}
          >
            Get started
          </Link>
        </nav>
      </header>

      <div style={{ flex: 1 }}>{children}</div>

      <MarketingFooter />
    </div>
  );
}
