import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";
import { getBusiness } from "@herledger/sdk";
import { getStellarNetworkConfig, getContractConfig } from "@/lib/stellar/config";

const RequestSchema = z.object({
  businessId: z.string().min(1),
});

interface SyncResponse {
  data: { success: boolean } | null;
  error: { code: string; message: string } | null;
}

const prisma = getPrismaClient();

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<SyncResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return typedJson<SyncResponse>(
      { data: null, error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return typedJson<SyncResponse>(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid request data" } },
      { status: 400 }
    );
  }

  const { businessId } = parsed.data;

  try {
    // Get DB record
    const dbBusiness = await prisma.businessProfile.findFirst({
      where: {
        businessId,
        userId: session.user.id,
      },
    });

    if (!dbBusiness) {
      return typedJson<SyncResponse>(
        { data: null, error: { code: "NOT_FOUND", message: "Business not found" } },
        { status: 404 }
      );
    }

    // Get on-chain record
    const networkConfig = getStellarNetworkConfig();
    const contractConfig = getContractConfig();
    const chainBusiness = await getBusiness(businessId, networkConfig, contractConfig);

    if (!chainBusiness) {
      return typedJson<SyncResponse>(
        { data: null, error: { code: "NOT_FOUND_ON_CHAIN", message: "Business not found on-chain" } },
        { status: 404 }
      );
    }

    // Update DB with on-chain data
    await prisma.businessProfile.update({
      where: { id: dbBusiness.id },
      data: {
        walletAddress: chainBusiness.wallet,
        metadataHash: chainBusiness.metadataHash,
        active: chainBusiness.active,
      },
    });

    return typedJson<SyncResponse>({
      data: { success: true },
      error: null,
    });
  } catch (err) {
    console.error({ operation: "sync-business", userId: session.user.id, error: err });
    return typedJson<SyncResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Sync failed" } },
      { status: 500 }
    );
  }
}
