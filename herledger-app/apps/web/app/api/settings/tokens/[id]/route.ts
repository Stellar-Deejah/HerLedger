import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";
import { revokePersonalAccessToken } from "@/lib/settings/tokens";

const prisma = getPrismaClient();

// ---------------------------------------------------------------------------
// DELETE /api/settings/tokens/:id — revoke a personal access token
// immediately. Scoped to the caller's own tokens; revoking someone else's
// (or an already-revoked) token id reports 404 rather than leaking whether
// the id exists.
// ---------------------------------------------------------------------------

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const { id } = await params;

  const { revoked } = await revokePersonalAccessToken(prisma, session.user.id, id);
  if (!revoked) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "TOKEN_NOT_FOUND", message: "Token not found or already revoked" },
      },
      { status: 404 }
    );
  }

  return NextResponse.json({ data: { id, revoked: true }, error: null });
}
