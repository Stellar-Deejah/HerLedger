import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";
import { createPersonalAccessToken, listPersonalAccessTokens } from "@/lib/settings/tokens";
import { getServerEnv } from "@herledger/config";

const prisma = getPrismaClient();

// ---------------------------------------------------------------------------
// GET  /api/settings/tokens — list the caller's tokens (never includes the hash)
// POST /api/settings/tokens — create a token; the plaintext value is
//   returned in this response only and cannot be retrieved again.
// ---------------------------------------------------------------------------

const postBodySchema = z.object({
  name: z.string().min(1).max(100),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const tokens = await listPersonalAccessTokens(prisma, session.user.id);
  return NextResponse.json({ data: { tokens }, error: null });
}

export async function POST(req: NextRequest) {
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

  const parsed = postBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { data: null, error: { code: "VALIDATION_ERROR", message: "A token name is required" } },
      { status: 400 }
    );
  }

  try {
    const pepper = getServerEnv().BETTER_AUTH_SECRET;
    const created = await createPersonalAccessToken(
      prisma,
      session.user.id,
      parsed.data.name,
      pepper
    );
    return NextResponse.json({ data: created, error: null }, { status: 201 });
  } catch (err) {
    console.error({ operation: "create-token", userId: session.user.id, error: err });
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to create token" } },
      { status: 500 }
    );
  }
}
