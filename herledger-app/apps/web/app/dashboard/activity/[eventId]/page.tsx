import type { Metadata } from "next";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { FinancialEventDetailServer } from "@/components/activity/financial-event-detail-server";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

export const metadata: Metadata = { title: "Financial Event" };

const prisma = getPrismaClient();

interface ActivityDetailPageProps {
  params: Promise<{ eventId: string }>;
}

export default async function ActivityDetailPage({ params }: ActivityDetailPageProps) {
  const { eventId } = await params;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    redirect("/auth/sign-in");
  }

  const profile = await prisma.businessProfile.findFirst({
    where: { userId: session.user.id },
    select: { businessId: true },
  });

  // Deliberately not Suspense-wrapped: notFound() is called inside
  // FinancialEventDetailServer, and once a Suspense boundary above it has
  // started streaming, the 200 status header is already sent -- the
  // not-found UI would render correctly but the HTTP status would stay 200
  // instead of 404. Awaiting it directly here (like the redirect() above)
  // keeps status codes accurate at the cost of streaming this page's data.
  return (
    <div>
      <FinancialEventDetailServer businessId={profile?.businessId ?? null} eventId={eventId} />
    </div>
  );
}
