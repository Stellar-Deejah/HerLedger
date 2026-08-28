import "server-only";

import { unstable_cache } from "next/cache";

import type { AttestationsData } from "@/app/api/attestations/schema";
import { getPrismaClient } from "@/lib/db/client";

const prisma = getPrismaClient();

// ---------------------------------------------------------------------------
// Shared data-access for attestations, used by GET /api/attestations and the
// RSC widgets that render the initial list during SSR.
//
// Unlike activity data, attestation status/claimDescription ARE mutated by
// this app itself (resync and claim-description routes) as well as by the
// indexer, so a `businessId`-scoped tag is worth having on top of the TTL:
// this app's own mutations can call revalidateTag() to reflect immediately,
// while indexer-driven changes still fall back to the TTL. unstable_cache is
// called *inside* each function (not hoisted to module scope) so the
// businessId can be closed over in both the cache key and the tag — with a
// module-scope call the tag would be fixed at first-import time and could
// never vary per business.
// ---------------------------------------------------------------------------

const ATTESTATIONS_REVALIDATE_SECONDS = 20;

export function attestationsTag(businessId: string): string {
  return `attestations:${businessId}`;
}

export async function getAttestations(
  businessId: string | null,
  includeRevoked: boolean
): Promise<AttestationsData> {
  if (!businessId) {
    return { attestations: [] };
  }

  const fetchAttestations = unstable_cache(
    async () => {
      const events = await prisma.financialEvent.findMany({
        where: { businessId },
        select: {
          eventId: true,
          attestations: {
            ...(includeRevoked ? {} : { where: { status: "Active" as const } }),
            orderBy: { ledgerSequence: "desc" },
            select: {
              id: true,
              attestationId: true,
              eventId: true,
              attesterAddress: true,
              claimHash: true,
              claimDescription: true,
              status: true,
              ledgerSequence: true,
            },
          },
        },
      });

      return events
        .flatMap((event) => event.attestations)
        .sort((a, b) => b.ledgerSequence - a.ledgerSequence);
    },
    [`attestations-${businessId}-${includeRevoked}`],
    { tags: [attestationsTag(businessId)], revalidate: ATTESTATIONS_REVALIDATE_SECONDS }
  );

  const attestations = await fetchAttestations();
  return { attestations };
}

export async function getActiveAttestationCount(businessId: string | null): Promise<number> {
  if (!businessId) return 0;

  const fetchCount = unstable_cache(
    async () => prisma.attestation.count({ where: { status: "Active", event: { businessId } } }),
    [`attestations-count-${businessId}`],
    { tags: [attestationsTag(businessId)], revalidate: ATTESTATIONS_REVALIDATE_SECONDS }
  );

  return fetchCount();
}
