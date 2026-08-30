import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { AttestationListServer } from "@/components/attestations/attestation-list-server";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Link, redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("attestations") };
}

const prisma = getPrismaClient();

export default async function AttestationsPage() {
  const t = await getTranslations("dashboard");
  const locale = await getLocale();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return redirect({ href: "/auth/sign-in", locale });
  }

  const profile = await prisma.businessProfile.findFirst({
    where: { userId: session.user.id },
    select: { businessId: true },
  });

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>{t("attestations")}</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link
            href={"/dashboard/attestations/create" as never}
            style={{
              padding: "0.5rem 1rem",
              background: "var(--primary)",
              color: "#fff",
              borderRadius: "var(--radius)",
              fontSize: "0.875rem",
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {t("createAttestation")}
          </Link>
          <Link
            href={"/dashboard/attestations/register" as never}
            style={{
              padding: "0.5rem 1rem",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius)",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "var(--foreground)",
              textDecoration: "none",
            }}
          >
            {t("registerAttester")}
          </Link>
        </div>
      </div>
      <Suspense fallback={<LoadingSpinner />}>
        <AttestationListServer businessId={profile?.businessId ?? null} />
      </Suspense>
    </div>
  );
}
