import { headers } from "next/headers";
import { NextRequest } from "next/server";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getDbClient } from "@herledger/db";

interface CurrentBusinessResponse {
  data: {
    id: string;
    name: string;
    metadataHash: string;
    active: boolean;
    owner: string;
    wallet: string;
  } | null;
  error: { code: string; message: string } | null;
}

export async function GET(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<CurrentBusinessResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  try {
    const db = getDbClient();
    const business = await db.businesses.findByUserId(session.user.id);

    if (!business) {
      return typedJson<CurrentBusinessResponse>(
        { data: null, error: { code: "NOT_FOUND", message: "Business not found" } },
        { status: 404 }
      );
    }

    return typedJson<CurrentBusinessResponse>({
      data: {
        id: business.businessId,
        name: business.displayName,
        metadataHash: business.metadataHash,
        active: business.active,
        owner: session.user.id,
        wallet: business.walletAddress,
      },
      error: null,
    });
  } catch (err) {
    console.error({ operation: "get-current-business", userId: session.user.id, error: err });
    return typedJson<CurrentBusinessResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to fetch business" } },
      { status: 500 }
    );
  }
}
