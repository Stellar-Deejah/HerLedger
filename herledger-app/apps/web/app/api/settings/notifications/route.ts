import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import { z } from "zod";
import { auth } from "@/lib/auth/server";
import { getPrismaClient } from "@/lib/db/client";
import {
  NOTIFICATION_EVENT_TYPES,
  getNotificationPreferences,
  saveNotificationPreferences,
} from "@/lib/settings/notifications";

const prisma = getPrismaClient();

// ---------------------------------------------------------------------------
// GET  /api/settings/notifications — current per-event-type email/in-app toggles
// PUT  /api/settings/notifications — save toggles
// ---------------------------------------------------------------------------

const preferenceSchema = z.object({
  eventType: z.enum(NOTIFICATION_EVENT_TYPES),
  email: z.boolean(),
  inApp: z.boolean(),
});

const putBodySchema = z.object({
  preferences: z.array(preferenceSchema).min(1),
});

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json(
      { data: null, error: { code: "UNAUTHORIZED", message: "Not authenticated" } },
      { status: 401 }
    );
  }

  const preferences = await getNotificationPreferences(prisma, session.user.id);
  return NextResponse.json({ data: { preferences }, error: null });
}

export async function PUT(req: NextRequest) {
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

  const parsed = putBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        data: null,
        error: { code: "VALIDATION_ERROR", message: "Invalid notification preferences" },
      },
      { status: 400 }
    );
  }

  try {
    await saveNotificationPreferences(prisma, session.user.id, parsed.data.preferences);
    const preferences = await getNotificationPreferences(prisma, session.user.id);
    return NextResponse.json({ data: { preferences }, error: null });
  } catch (err) {
    console.error({
      operation: "save-notification-preferences",
      userId: session.user.id,
      error: err,
    });
    return NextResponse.json(
      { data: null, error: { code: "INTERNAL_ERROR", message: "Failed to save preferences" } },
      { status: 500 }
    );
  }
}
