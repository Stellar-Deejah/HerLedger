import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";
import { deactivateBusiness } from "@herledger/sdk";
import { getStellarNetworkConfig, getContractConfig } from "@/lib/stellar/config";
import { getAccount } from "@/lib/stellar/account";

const RequestSchema = z.object({
  businessId: z.string().min(1),
});

interface DeactivateResponse {
  data: { success: boolean } | null;
  error: { code: string; message: string } | null;
}

const prisma = getPrismaClient();

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<DeactivateResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return typedJson<DeactivateResponse>(
      { data: null, error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return typedJson<DeactivateResponse>(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid request data" } },
      { status: 400 }
    );
  }

  const { businessId } = parsed.data;

  try {
    // Verify business ownership
    const dbBusiness = await prisma.businessProfile.findFirst({
      where: {
        businessId,
        userId: session.user.id,
      },
    });

    if (!dbBusiness) {
      return typedJson<DeactivateResponse>(
        { data: null, error: { code: "NOT_FOUND", message: "Business not found" } },
        { status: 404 }
      );
    }

    if (!dbBusiness.active) {
      return typedJson<DeactivateResponse>(
        { data: null, error: { code: "ALREADY_INACTIVE", message: "Business is already inactive" } },
        { status: 400 }
      );
    }

    // Get Stellar account for signing
    const networkConfig = getStellarNetworkConfig();
    const contractConfig = getContractConfig();
    const sourceAccount = await getAccount(dbBusiness.walletAddress);

    // Call on-chain deactivation
    await deactivateBusiness(
      {
        businessId,
        owner: session.user.id,
        sourceAccount,
      },
      networkConfig,
      contractConfig
    );

    // Update DB
    await prisma.businessProfile.update({
      where: { id: dbBusiness.id },
      data: { active: false },
    });

    return typedJson<DeactivateResponse>({
      data: { success: true },
      error: null,
    });
  } catch (err) {
    console.error({ operation: "deactivate-business", userId: session.user.id, error: err });
    return typedJson<DeactivateResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Deactivation failed" } },
      { status: 500 }
    );
  }
}
