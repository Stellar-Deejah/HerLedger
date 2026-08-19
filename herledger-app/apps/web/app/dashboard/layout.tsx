import Link from "next/link";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { DashboardNav } from "@/components/navigation/dashboard-nav";
import { auth } from "@/lib/auth/server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/auth/sign-in?callbackUrl=/dashboard");

  const onboardingCompleted = session.user.onboardingCompleted;
  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      <DashboardNav onboardingCompleted={onboardingCompleted} />
      <main
        style={{
          flex: 1,
          padding: "2rem",
          maxWidth: "1200px",
          marginLeft: "auto",
          marginRight: "auto",
          width: "100%",
        }}
      >
        {!onboardingCompleted && (
          <section
            aria-labelledby="onboarding-title"
            role="status"
            style={{
              marginBottom: "1.5rem", padding: "1rem 1.25rem", border: "1px solid #b7791f",
              borderLeft: "4px solid #d69e2e", borderRadius: "var(--radius)", background: "#fffbeb",
            }}
          >
            <strong id="onboarding-title">Finish setting up your business</strong>
            <p style={{ margin: "0.35rem 0 0", color: "var(--muted)" }}>
              Register your business to unlock attestations and dispute management.
            </p>
            <Link href="/dashboard/business" style={{ display: "inline-block", marginTop: "0.75rem", fontWeight: 600 }}>
              Register business
            </Link>
          </section>
        )}
        {children}
      </main>
    </div>
  );
}
