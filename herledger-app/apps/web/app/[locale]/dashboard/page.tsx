import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLocale, getTranslations } from "next-intl/server";
import { Suspense } from "react";

import { OverviewPanel } from "@/components/activity/dashboard-summary-server";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("dashboard");
  return { title: t("title") };
}

const prisma = getPrismaClient();

export default async function DashboardPage() {
  const t = await getTranslations("dashboard");
  const activityT = await getTranslations("activity");
  const locale = await getLocale();
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return redirect({ href: "/auth/sign-in", locale });
  }

  const profile = await prisma.businessProfile.findFirst({
    where: { userId: session.user.id },
    select: { businessId: true, displayName: true, active: true },
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>{t("title")}</h1>
      <Suspense fallback={<LoadingSpinner label={activityT("loadingOverview")} />}>
        <OverviewPanel
          businessId={profile?.businessId ?? null}
          businessProfile={
            profile ? { displayName: profile.displayName, active: profile.active } : null
          }
        />
      </Suspense>
    </div>
  );
}
