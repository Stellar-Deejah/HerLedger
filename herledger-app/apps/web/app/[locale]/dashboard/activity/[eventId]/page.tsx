import type { Metadata } from "next";
import { headers } from "next/headers";
import { getLocale } from "next-intl/server";

import { FinancialEventDetailServer } from "@/components/activity/financial-event-detail-server";
import { redirect } from "@/i18n/navigation";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

export const metadata: Metadata = { title: "Financial Event" };

const prisma = getPrismaClient();

interface ActivityDetailPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const { eventId } = await params;

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
      <FinancialEventDetailServer businessId={profile?.businessId ?? null} eventId={eventId} />
    </div>
  );
}
