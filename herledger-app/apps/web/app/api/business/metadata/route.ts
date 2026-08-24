import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { z } from "zod";

import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";
import { getAccount } from "@/lib/stellar/account";
import { getContractConfig, getStellarNetworkConfig } from "@/lib/stellar/config";
import { getDbClient } from "@herledger/db";
import { updateBusinessMetadata } from "@herledger/sdk";

const RequestSchema = z.object({
  businessId: z.string().min(1),
  metadataHash: z
    .string()
    .regex(/^[0-9a-f]{64}$/i, "Metadata hash must be a 64-character hexadecimal string (SHA-256)"),
});

interface MetadataUpdateResponse {
  data: { success: boolean } | null;
  error: { code: string; message: string } | null;
}

// Idempotency key storage (in production, use Redis or similar)
const idempotencyKeys = new Map<string, { status: string; result: unknown }>();

export async function PUT(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return typedJson<MetadataUpdateResponse>(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return typedJson<MetadataUpdateResponse>(
      { data: null, error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return typedJson<MetadataUpdateResponse>(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid request data" } },
      { status: 400 }
    );
  }

  const { businessId, metadataHash } = parsed.data;

  // Generate idempotency key from businessId + metadataHash
  const idempotencyKey = `${businessId}:${metadataHash}`;

  // Check for existing idempotent request
  const existing = idempotencyKeys.get(idempotencyKey);
  if (existing) {
    if (existing.status === "completed") {
      return typedJson<MetadataUpdateResponse>({
        data: { success: true },
        error: null,
      });
    }
    if (existing.status === "failed") {
      return typedJson<MetadataUpdateResponse>(
        { data: null, error: { code: "PREVIOUS_FAILED", message: "Previous request failed" } },
        { status: 500 }
      );
    }
    // If in progress, return conflict
    return typedJson<MetadataUpdateResponse>(
      { data: null, error: { code: "IN_PROGRESS", message: "Request already in progress" } },
      { status: 409 }
    );
  }

  // Mark as in progress
  idempotencyKeys.set(idempotencyKey, { status: "in_progress", result: null });

  try {
    const db = getDbClient();
    const dbBusiness = await db.businesses.findById(businessId);

    if (!dbBusiness || dbBusiness.userId !== session.user.id) {
      idempotencyKeys.delete(idempotencyKey);
      return typedJson<MetadataUpdateResponse>(
        { data: null, error: { code: "NOT_FOUND", message: "Business not found" } },
        { status: 404 }
      );
    }

    // Get Stellar account for signing
    const networkConfig = getStellarNetworkConfig();
    const contractConfig = getContractConfig();
    const sourceAccount = await getAccount(dbBusiness.walletAddress);

    // Call on-chain update
    await updateBusinessMetadata(
      {
        businessId,
        metadataHash,
        owner: session.user.id,
        sourceAccount,
      },
      networkConfig,
      contractConfig
    );

    // Update DB
    await db.businesses.update(dbBusiness.id, { metadataHash });

    // Mark as completed
    idempotencyKeys.set(idempotencyKey, { status: "completed", result: { success: true } });

    // Clean up old idempotency keys (keep last 1000)
    if (idempotencyKeys.size > 1000) {
      const keysToDelete = Array.from(idempotencyKeys.keys()).slice(0, 500);
      keysToDelete.forEach((key) => idempotencyKeys.delete(key));
    }

    return typedJson<MetadataUpdateResponse>({
      data: { success: true },
      error: null,
    });
  } catch (err) {
    console.error({ operation: "update-metadata", userId: session.user.id, error: err });
    idempotencyKeys.set(idempotencyKey, { status: "failed", result: err });
    return typedJson<MetadataUpdateResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Metadata update failed" } },
      { status: 500 }
    );
  }
}
