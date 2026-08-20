import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";

import { RequestSchema, type AttestableEventsResponse } from "./schema";

const prisma = getPrismaClient();

const WalletParamSchema = z.object({ walletAddress: z.string().min(56).max(56) });

// Lists FinancialEvents an attester can attest to. Unlike GET
// /api/activity/recent (scoped to the signed-in user's own business),
// attesters are auditing OTHER businesses' events, so this is
// intentionally not businessId-scoped -- it lists across all businesses.
// Gated on the caller holding an active AttesterProfile for the supplied
// wallet address (see attester-status/route.ts for the same check), not
// just on being signed in, since the underlying data spans every business
// on the platform.
export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<AttestableEventsResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(req.url);
  const walletParsed = WalletParamSchema.safeParse({
    walletAddress: searchParams.get("walletAddress") ?? undefined,
  });
  if (!walletParsed.success) {
    return typedJson<AttestableEventsResponse>(
      { data: null, error: { code: "INVALID_PARAMS", message: "Missing wallet address" } },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse({
    offset: searchParams.get("offset"),
    limit: searchParams.get("limit"),
  });
  if (!parsed.success) {
    return typedJson<AttestableEventsResponse>(
      { data: null, error: { code: "INVALID_PARAMS", message: "Invalid pagination params" } },
      { status: 400 }
    );
  }

  const attester = await prisma.attesterProfile.findUnique({
    where: { walletAddress: walletParsed.data.walletAddress },
    select: { active: true },
  });
  if (!attester?.active) {
    return typedJson<AttestableEventsResponse>(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Wallet is not a registered attester" },
      },
      { status: 403 }
    );
  }

  const events = await prisma.financialEvent.findMany({
    orderBy: { ledgerSequence: "desc" },
    skip: parsed.data.offset,
    take: parsed.data.limit,
  });

  return typedJson<AttestableEventsResponse>({
    data: {
      events,
      pagination: {
        offset: parsed.data.offset,
        limit: parsed.data.limit,
        count: events.length,
      },
    },
    error: null,
  });
}
