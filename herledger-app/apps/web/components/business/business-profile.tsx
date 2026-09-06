"use client";

import { useSession } from "@/lib/auth/client";
import { EmptyState } from "@/components/ui/empty-state";
import { BusinessRegistrationForm } from "./business-registration-form";

export function BusinessProfile() {
  const { data: session, isPending } = useSession();

  if (isPending) {
    return <p style={{ color: "var(--muted)" }}>Loading…</p>;
  }

  if (!session) {
    return <EmptyState title="Not signed in" />;
  }

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
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "1rem" }}>
          Register your business
        </h2>
        <p style={{ color: "var(--muted)", fontSize: "0.9375rem", marginBottom: "1.5rem" }}>
          Connect your Stellar wallet and register your business on HerLedger. Your business ID and
          registration will be confirmed on the Stellar network.
        </p>
        <BusinessRegistrationForm />
      </section>
    </div>
  );
}
