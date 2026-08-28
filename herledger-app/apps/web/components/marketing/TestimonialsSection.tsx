import Image from "next/image";

interface Testimonial {
  quote: string;
  author: string;
  role: string;
  avatar: string;
  alt: string;
}

const testimonials: Testimonial[] = [
  {
    quote:
      "HerLedger gave our export business the verifiable proof of payments needed to secure trade financing without exposing our supplier agreements.",
    author: "Amina K.",
    role: "Founder, CraftWeave Artisans",
    avatar: "/images/testimonial-avatar-1.svg",
    alt: "Amina K. avatar",
  },
  {
    quote:
      "As an attester, the cryptographic signatures on Stellar make validating merchant event histories transparent, fast, and dispute-resistant.",
    author: "Fatima Z.",
    role: "Credit Officer, Women Venture Fund",
    avatar: "/images/testimonial-avatar-2.svg",
    alt: "Fatima Z. avatar",
  },
];

export function TestimonialsSection() {
  return (
    <section
      style={{
        maxWidth: "960px",
        margin: "0 auto 6rem",
        padding: "0 1.5rem",
      }}
    >
      <div style={{ textAlign: "center", marginBottom: "3rem" }}>
        <h2
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
            color: "var(--foreground)",
          }}
        >
          Trusted by businesses and attesters
        </h2>
        <p style={{ fontSize: "1.125rem", color: "var(--color-muted-text)" }}>
          Real experiences building financial reputation on Stellar.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "2rem",
        }}
      >
        {testimonials.map((t) => (
          <div
            key={t.author}
            style={{
              padding: "2rem",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border)",
              background: "var(--background)",
              display: "flex",
              flexDirection: "column",
              justifyContent: "space-between",
              boxShadow: "0 2px 4px rgba(0, 0, 0, 0.04)",
            }}
          >
            <p
              style={{
                fontSize: "1rem",
                lineHeight: 1.6,
                color: "var(--foreground)",
                fontStyle: "italic",
                marginBottom: "1.5rem",
              }}
            >
              &ldquo;{t.quote}&rdquo;
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
              <Image
                src={t.avatar}
                alt={t.alt}
                width={48}
                height={48}
                loading="lazy"
                fetchPriority="low"
                sizes="48px"
                style={{ borderRadius: "50%" }}
              />
              <div>
                <div style={{ fontWeight: 600, color: "var(--foreground)", fontSize: "0.9375rem" }}>
                  {t.author}
                </div>
                <div style={{ fontSize: "0.8125rem", color: "var(--color-muted-text)" }}>
                  {t.role}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
