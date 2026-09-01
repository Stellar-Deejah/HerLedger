import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { OverviewPanel } from "@/components/activity/dashboard-summary-server";
import { OverviewSkeleton } from "@/components/ui/loading-skeletons";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

export const metadata: Metadata = { title: "Dashboard" };

const prisma = getPrismaClient();

export default async function DashboardPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/auth/sign-in");
  }

  const profile = await prisma.businessProfile.findFirst({
    where: { userId: session.user.id },
    select: { businessId: true, displayName: true, active: true },
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Dashboard</h1>
      <Suspense fallback={<OverviewSkeleton />}>
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
