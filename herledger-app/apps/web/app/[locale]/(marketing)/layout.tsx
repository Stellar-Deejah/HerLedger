import type { Metadata } from "next";
import Image from "next/image";
import { getTranslations } from "next-intl/server";

import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { Link } from "@/i18n/navigation";
import { SITE_URL } from "@/lib/seo/site";

const TITLE = "HerLedger — Verifiable Financial History for Women-Owned Businesses";
const DESCRIPTION =
  "Build an immutable, portable, and verifiable financial reputation on Stellar without sharing unnecessary private information.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: SITE_URL,
    siteName: "HerLedger",
    images: [
      {
        url: "/images/og-image.png",
        width: 1200,
        height: 630,
        alt: "HerLedger — Verifiable Financial History for Women-Owned Businesses",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/images/og-image.png"],
  },
};

export default async function MarketingLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("marketing");
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
            {t("signIn")}
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
            {t("getStarted")}
          </Link>
        </nav>
      </header>

      <div style={{ flex: 1 }}>{children}</div>

      <MarketingFooter />
    </div>
  );
}
