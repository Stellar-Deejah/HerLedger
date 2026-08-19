import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { RequestSchema } from "./schema";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";
import { requireBusinessOwner } from "@/lib/auth/require-business-owner";

import type { AttestationsResponse } from "./schema";

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

  const ownership = await requireBusinessOwner(session);
  if (!ownership.ok) {
    return typedJson<AttestationsResponse>(
      { data: null, error: { code: ownership.code, message: ownership.message } },
      { status: ownership.status }
    );
  }

  const events = await prisma.financialEvent.findMany({
    where: { businessId: ownership.businessId },
    select: {
      eventId: true,
      attestations: {
        ...(parsed.data.includeRevoked ? {} : { where: { status: "Active" as const } }),
        orderBy: { ledgerSequence: "desc" },
      },
    },
  });

  const attestations = events
    .flatMap((event) => event.attestations)
    .sort((a, b) => b.ledgerSequence - a.ledgerSequence);

  return typedJson<AttestationsResponse>({ data: { attestations }, error: null });
}
