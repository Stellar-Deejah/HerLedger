import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getContractConfig, getStellarNetworkConfig } from "@/lib/stellar/config";
import { getDbClient } from "@herledger/db";
import { getBusiness } from "@herledger/sdk";

const RequestSchema = z.object({
  businessId: z.string().min(1),
});

interface Discrepancy {
  field: string;
  dbValue: string;
  chainValue: string;
}

interface VerifyResponse {
  data: {
    discrepancies: Discrepancy[];
    upToDate: boolean;
  } | null;
  error: { code: string; message: string } | null;
}

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<VerifyResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return typedJson<VerifyResponse>(
      { data: null, error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return typedJson<VerifyResponse>(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid request data" } },
      { status: 400 }
    );
  }

  const { businessId } = parsed.data;

  try {
    const db = getDbClient();
    const dbBusiness = await db.businesses.findById(businessId);

    if (!dbBusiness || dbBusiness.userId !== session.user.id) {
      return typedJson<VerifyResponse>(
        { data: null, error: { code: "NOT_FOUND", message: "Business not found" } },
        { status: 404 }
      );
    }

    // Get on-chain record
    const networkConfig = getStellarNetworkConfig();
    const contractConfig = getContractConfig();
    const chainBusiness = await getBusiness(businessId, networkConfig, contractConfig);

    if (!chainBusiness) {
      return typedJson<VerifyResponse>(
        {
          data: null,
          error: { code: "NOT_FOUND_ON_CHAIN", message: "Business not found on-chain" },
        },
        { status: 404 }
      );
    }

    // Compare fields
    const discrepancies: Discrepancy[] = [];

    if (dbBusiness.walletAddress !== chainBusiness.wallet) {
      discrepancies.push({
        field: "Wallet Address",
        dbValue: dbBusiness.walletAddress,
        chainValue: chainBusiness.wallet,
      });
    }

    if (dbBusiness.metadataHash !== chainBusiness.metadataHash) {
      discrepancies.push({
        field: "Metadata Hash",
        dbValue: dbBusiness.metadataHash,
        chainValue: chainBusiness.metadataHash,
      });
    }

    if (dbBusiness.active !== chainBusiness.active) {
      discrepancies.push({
        field: "Active Status",
        dbValue: dbBusiness.active ? "Active" : "Inactive",
        chainValue: chainBusiness.active ? "Active" : "Inactive",
      });
    }

    return typedJson<VerifyResponse>({
      data: {
        discrepancies,
        upToDate: discrepancies.length === 0,
      },
      error: null,
    });
  } catch (err) {
    console.error({ operation: "verify-business", userId: session.user.id, error: err });
    return typedJson<VerifyResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Verification failed" } },
      { status: 500 }
    );
  }
}
