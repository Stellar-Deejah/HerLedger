import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { ActivityListServer } from "@/components/activity/activity-list-server";
import { ActivityListSkeleton } from "@/components/ui/loading-skeletons";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

export const metadata: Metadata = { title: "Financial Activity" };

const prisma = getPrismaClient();

export default async function ActivityPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/auth/sign-in");
  }

  const profile = await prisma.businessProfile.findFirst({
    where: { userId: session.user.id },
    select: { businessId: true },
  });

  return (
    <div>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Financial Activity
      </h1>
      <Suspense fallback={<ActivityListSkeleton />}>
        <ActivityListServer businessId={profile?.businessId ?? null} />
      </Suspense>
    </div>
  );
}
