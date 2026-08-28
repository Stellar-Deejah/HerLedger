import Image from "next/image";
import Link from "next/link";

export function HeroSection() {
  return (
    <section
      style={{
        maxWidth: "960px",
        margin: "4rem auto 5rem",
        padding: "0 1.5rem",
        textAlign: "center",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.375rem 0.875rem",
          borderRadius: "var(--radius-full)",
          background: "var(--color-muted-bg)",
          border: "1px solid var(--border)",
          fontSize: "var(--font-size-sm)",
          color: "var(--color-muted-text)",
          marginBottom: "1.5rem",
        }}
      >
        <span
          style={{
            width: "8px",
            height: "8px",
            borderRadius: "50%",
            background: "var(--color-success)",
          }}
        />
        <span>Built on the Stellar Network</span>
      </div>

      <h1
        style={{
          fontSize: "2.75rem",
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.02em",
          marginBottom: "1.25rem",
          maxWidth: "800px",
          color: "var(--foreground)",
        }}
      >
        Build a verifiable financial history for your business
      </h1>

      <p
        style={{
          fontSize: "1.25rem",
          color: "var(--color-muted-text)",
          marginBottom: "2.5rem",
          lineHeight: 1.6,
          maxWidth: "680px",
        }}
      >
        HerLedger records recognized Stellar transactions and verified attestations so your business
        can build a portable, auditable financial history — without exposing sensitive customer
        data.
      </p>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          justifyContent: "center",
          flexWrap: "wrap",
          marginBottom: "3.5rem",
        }}
      >
        <Link
          href="/auth/sign-up"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--primary)",
            color: "#ffffff",
            padding: "0.875rem 1.75rem",
            borderRadius: "var(--radius-md)",
            fontWeight: 600,
            fontSize: "1rem",
            textDecoration: "none",
            boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
          }}
        >
          Register your business
        </Link>
        <Link
          href="#features"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            background: "var(--background)",
            color: "var(--foreground)",
            border: "1px solid var(--border)",
            padding: "0.875rem 1.75rem",
            borderRadius: "var(--radius-md)",
            fontWeight: 600,
            fontSize: "1rem",
            textDecoration: "none",
          }}
        >
          Explore features
        </Link>
      </div>

      <div
        style={{
          width: "100%",
          maxWidth: "800px",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)",
          border: "1px solid var(--border)",
          background: "#0f172a",
        }}
      >
        <Image
          src="/images/hero-preview.svg"
          alt="HerLedger verifiable financial dashboard interface preview"
          width={800}
          height={480}
          priority
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 800px"
          style={{
            width: "100%",
            height: "auto",
            display: "block",
          }}
        />
      </div>
    </section>
  );
}
