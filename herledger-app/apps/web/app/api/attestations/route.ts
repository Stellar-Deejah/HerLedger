import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { projectFields } from "@/lib/api/projection";
import { rateLimitKey } from "@/lib/api/rate-limit";
import { readLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { requireBusinessOwner } from "@/lib/auth/require-business-owner";
import { getAttestations } from "@/lib/data/attestations";
import { withRateLimit } from "@/lib/rate-limit";

import { RequestSchema } from "./schema";
import type { AttestationsResponse, AttestationDto } from "./schema";

export const GET = withRateLimit(async (req: NextRequest) => {
  const session = await auth.api.getSession({ headers: await headers() });

  const limited = readLimiter.check(rateLimitKey(req, session?.user?.id));
  if (limited) return limited;

  if (!session) {
    return typedJson<AttestationsResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" },
          meta: null
        },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const parsed = RequestSchema.safeParse({
    includeRevoked: searchParams.get("includeRevoked") ?? undefined,
  });
  if (!parsed.success) {
    return typedJson<AttestationsResponse>(
      { data: null, error: { code: "INVALID_PARAMS", message: "Invalid query params" },
          meta: null
        },
      { status: 422 }
    );
  }

  const ownership = await requireBusinessOwner(session);
  if (!ownership.ok) {
    return typedJson<AttestationsResponse>(
      { data: null, error: { code: ownership.code, message: ownership.message }, meta: null },
      { status: ownership.status }
    );
  }

  const data = await getAttestations(ownership.businessId, parsed.data.includeRevoked);

  const allowedFields: (keyof AttestationDto)[] = [
    "id", "attestationId", "eventId", "attesterAddress", "claimHash",
    "claimDescription", "status", "ledgerSequence",
  ];

  const projectedAttestations = data.attestations.map((att) =>
    projectFields(att, allowedFields)
  ) as AttestationDto[];

  return typedJson<AttestationsResponse>({
    data: { attestations: projectedAttestations },
    error: null,
    meta: null,
  });
});
