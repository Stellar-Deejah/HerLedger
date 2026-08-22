import { getDbClient } from "@herledger/db";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";

import { RequestSchema, type AttestableEventsResponse } from "./schema";

const WalletParamSchema = z.object({ walletAddress: z.string().min(56).max(56) });

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

  const db = getDbClient();
  const attester = await db.attesters.findByWallet(walletParsed.data.walletAddress);
  if (!attester?.active) {
    return typedJson<AttestableEventsResponse>(
      {
        data: null,
        error: { code: "FORBIDDEN", message: "Wallet is not a registered attester" },
      },
      { status: 403 }
    );
  }

  const events = await db.financialEvents.findAttestableEvents({
    offset: parsed.data.offset,
    limit: parsed.data.limit,
  });

  return typedJson<AttestableEventsResponse>({
    data: {
      // `createdAt` travels as an ISO string over JSON (see the shared
      // FinancialEventSchema).
      events: events.map((event) => ({ ...event, createdAt: event.createdAt.toISOString() })),
      pagination: {
        offset: parsed.data.offset,
        limit: parsed.data.limit,
        count: events.length,
      },
    },
    error: null,
  });
}
