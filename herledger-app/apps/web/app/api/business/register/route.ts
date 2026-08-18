import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { prisma } from "@/lib/db";
import { headers } from "next/headers";

const bodySchema = z.object({
  businessId: z.string().length(64),
  walletAddress: z.string().min(56).max(56),
  displayName: z.string().min(1).max(200),
  metadataHash: z.string().length(64),
  txHash: z.string().min(1),
});

export async function POST(req: NextRequest) {
  // Verify the user is authenticated
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { data: null, error: { code: "INVALID_BODY", message: "Invalid request body" } },
      { status: 400 }
    );
  }

  const parsed = bodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "Invalid registration data" } },
      { status: 400 }
    );
  }

  const { businessId, walletAddress, displayName, metadataHash } = parsed.data;

  try {
    // Do not register in the DB if the user already has a business
    const existing = await prisma.businessProfile.findFirst({
      where: { userId: session.user.id },
    });
    if (existing) {
      return NextResponse.json(
        { data: null, error: { code: "ALREADY_REGISTERED", message: "Business already registered for this account" } },
        { status: 409 }
      );
    }

    const profile = await prisma.businessProfile.create({
      data: {
        userId: session.user.id,
        businessId,
        walletAddress,
        displayName,
        metadataHash,
        active: true,
      },
    });

    return NextResponse.json({ data: { businessId: profile.businessId }, error: null });
  } catch (err) {
    console.error({ operation: "register-business", userId: session.user.id, error: err });
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Registration failed" } },
      { status: 500 }
    );
  }
}
