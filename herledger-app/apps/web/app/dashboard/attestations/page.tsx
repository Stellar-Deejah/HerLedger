import type { Metadata } from "next";
import { headers } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { AttestationListServer } from "@/components/attestations/attestation-list-server";
import { AttestationListSkeleton } from "@/components/ui/loading-skeletons";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

export const metadata: Metadata = { title: "Attestations" };

const prisma = getPrismaClient();

export default async function AttestationsPage() {
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
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          gap: "1rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 700 }}>Attestations</h1>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <Link
            href="/dashboard/attestations/create"
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
            Create attestation
          </Link>
          <Link
            href="/dashboard/attestations/register"
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
            Register attester
          </Link>
        </div>
      </div>
      <Suspense fallback={<AttestationListSkeleton />}>
        <AttestationListServer businessId={profile?.businessId ?? null} />
      </Suspense>
    </div>
  );
}
