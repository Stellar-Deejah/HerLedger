import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { projectFields } from "@/lib/api/projection";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getAttestations } from "@/lib/data/attestations";
import { getPrismaClient } from "@/lib/db/client";

import { RequestSchema } from "./schema";
import type { AttestationsResponse, AttestationDto } from "./schema";

const prisma = getPrismaClient();

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<AttestationsResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = RequestSchema.safeParse({
    includeRevoked: searchParams.get("includeRevoked") ?? undefined,
  });
  if (!parsed.success) {
    return typedJson<AttestationsResponse>(
      { data: null, error: { code: "INVALID_PARAMS", message: "Invalid query params" } },
      { status: 400 }
    );
  }

  const profile = await prisma.businessProfile.findFirst({
    where: { userId: session.user.id },
    select: { businessId: true },
  });

  const isOwner = Boolean(profile?.businessId);
  const data = await getAttestations(profile?.businessId ?? null, parsed.data.includeRevoked);

  const allowedFields: (keyof AttestationDto)[] = isOwner
    ? [
        "id",
        "attestationId",
        "eventId",
        "attesterAddress",
        "claimHash",
        "claimDescription",
        "status",
        "ledgerSequence",
      ]
    : [
        "id",
        "attestationId",
        "eventId",
        "attesterAddress",
        "claimDescription",
        "status",
        "ledgerSequence",
      ];

  const projectedAttestations = data.attestations.map((att) =>
    projectFields(att, allowedFields)
  ) as AttestationDto[];

  return typedJson<AttestationsResponse>({ data: { attestations: projectedAttestations }, error: null });
}
