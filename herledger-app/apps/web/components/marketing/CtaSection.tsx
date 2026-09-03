import Image from "next/image";

import { Link } from "@/i18n/navigation";

export function CtaSection() {
  return (
    <section
      style={{
        maxWidth: "960px",
        margin: "0 auto 6rem",
        padding: "0 1.5rem",
      }}
    >
      <div
        style={{
          background: "linear-gradient(135deg, #1e3a8a 0%, #1c4ed8 100%)",
          borderRadius: "var(--radius-lg)",
          padding: "4rem 2rem",
          color: "#ffffff",
          textAlign: "center",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          boxShadow: "0 10px 15px -3px rgba(28, 78, 216, 0.2)",
        }}
      >
        <div style={{ marginBottom: "1.5rem" }}>
          <Image
            src="/images/cta-badge.svg"
            alt="HerLedger security and verified reputation badge"
            width={72}
            height={72}
            loading="lazy"
            fetchPriority="low"
            sizes="72px"
          />
        </div>
        <h2
          style={{
            fontSize: "2.25rem",
            fontWeight: 800,
            lineHeight: 1.2,
            marginBottom: "1rem",
            maxWidth: "600px",
          }}
        >
          Ready to turn transactions into your business superpower?
        </h2>
        <p
          style={{
            fontSize: "1.125rem",
            color: "#dbeafe",
            marginBottom: "2rem",
            maxWidth: "540px",
            lineHeight: 1.6,
          }}
        >
          Join women entrepreneurs building verifiable financial independence on Stellar today.
        </p>
        <Link
          href="/auth/sign-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#ffffff",
            color: "#1c4ed8",
            padding: "0.875rem 2rem",
            borderRadius: "var(--radius-md)",
            fontWeight: 700,
            fontSize: "1rem",
            textDecoration: "none",
            boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
          }}
        >
          Get started for free
        </Link>
      </div>
    </section>
  );
}
