import { getDbClient } from "@herledger/db";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth/server";
import { NextRequest } from "next/server";
import { z } from "zod";

import { getClientIp } from "@/lib/api/rate-limit";
import { authLimiter } from "@/lib/api/rate-limit-config";
import { typedJson } from "@/lib/api/route-handler";
import { auth } from "@/lib/auth/server";

const BodySchema = z.object({
  password: z.string().min(1, "Password is required"),
});

interface AccountDeleteResponse {
  data: { success: boolean } | null;
  error: { code: string; message: string } | null;
}

export async function DELETE(request: NextRequest | Request) {
  const limited = authLimiter.check(getClientIp(request));
  if (limited) return limited;

  try {
    const session = await auth.api.getSession({
      headers: request.headers,
    });

    if (!session || !session.user) {
      return typedJson<AccountDeleteResponse>(
        { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
        { status: 401 }
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return typedJson<AccountDeleteResponse>(
        { data: null, error: { code: "INVALID_BODY", message: "Invalid request body" } },
        { status: 400 }
      );
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return typedJson<AccountDeleteResponse>(
        { data: null, error: { code: "VALIDATION_ERROR", message: "Password is required" } },
        { status: 400 }
      );
    }

    // Verify password via Better Auth API
    try {
      await auth.api.signInEmail({
        body: {
          email: session.user.email,
          password: parsed.data.password,
        },
      });
    } catch {
      return typedJson<AccountDeleteResponse>(
        { data: null, error: { code: "INVALID_PASSWORD", message: "Invalid password" } },
        { status: 401 }
      );
    }

    // Process deletion via db repository
    const db = getDbClient();
    await db.users.deleteAccount(session.user.id);

    return typedJson<AccountDeleteResponse>({
      data: { success: true },
      error: null,
    });
  } catch (error) {
    console.error({ operation: "delete-account", error });
    return typedJson<AccountDeleteResponse>(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to delete account" } },
      { status: 500 }
    );
  }
}
