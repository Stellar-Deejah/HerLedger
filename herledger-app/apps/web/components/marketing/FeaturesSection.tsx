import Image from "next/image";

interface Feature {
  title: string;
  description: string;
  icon: string;
  alt: string;
}

const features: Feature[] = [
  {
    title: "Stellar Settlement Tracking",
    description:
      "Automatically indexes on-chain payment sent and received records directly into your verified business timeline.",
    icon: "/images/feature-stellar.svg",
    alt: "Stellar payment settlement icon",
  },
  {
    title: "Third-Party Attestations",
    description:
      "Invite recognized partners, suppliers, and financial intermediaries to cryptographically attest to transactions.",
    icon: "/images/feature-attestation.svg",
    alt: "Cryptographic attestations icon",
  },
  {
    title: "Zero-Knowledge Privacy",
    description:
      "Sensitive invoice details, recipient identities, and notes remain off-chain; only cryptographic hashes anchor to ledger.",
    icon: "/images/feature-privacy.svg",
    alt: "Off-chain privacy protection icon",
  },
  {
    title: "Portable Credit Passport",
    description:
      "Export auditable financial statements and verifiable proofs to lenders and partners worldwide without lock-in.",
    icon: "/images/feature-portable.svg",
    alt: "Portable business financial passport icon",
  },
];

export function FeaturesSection() {
  return (
    <section
      id="features"
      style={{
        maxWidth: "960px",
        margin: "0 auto 6rem",
        padding: "0 1.5rem",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "3.5rem" }}>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
            color: "var(--foreground)",
          }}
        >
          Engineered for verifiable credibility
        </h2>
        <p
          style={{
            fontSize: "1.125rem",
            color: "var(--color-muted-text)",
            maxWidth: "600px",
            margin: "0 auto",
          }}
        >
          Everything you need to turn daily business transactions into an immutable track record.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1.75rem",
        }}
      >
        {features.map((feature) => (
          <div
            key={feature.title}
            style={{
              padding: "2rem 1.5rem",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--background)",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
            }}
          >
            <div style={{ marginBottom: "1.25rem" }}>
              <Image
                src={feature.icon}
                alt={feature.alt}
                width={64}
                height={64}
                loading="lazy"
                fetchPriority="low"
                sizes="64px"
              />
            </div>
            <h3
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                marginBottom: "0.5rem",
                color: "var(--foreground)",
              }}
            >
              {feature.title}
            </h3>
            <p
              style={{
                fontSize: "0.9375rem",
                color: "var(--color-muted-text)",
                lineHeight: 1.5,
                margin: 0,
              }}
            >
              {feature.description}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
