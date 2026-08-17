import type { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Notification preferences — infrastructure for a future notification
// system. Nothing sends a notification yet; this stores, per user, which
// channels (email / in-app) should fire for each on-chain-triggered event
// type once a dispatcher exists.
// ---------------------------------------------------------------------------

export const NOTIFICATION_EVENT_TYPES = [
  "NewAttestation",
  "DisputeResolution",
  "BusinessDeactivation",
] as const;

export type NotificationEventType = (typeof NOTIFICATION_EVENT_TYPES)[number];

export interface NotificationPreferenceValue {
  eventType: NotificationEventType;
  email: boolean;
  inApp: boolean;
}

const DEFAULTS: Omit<NotificationPreferenceValue, "eventType"> = {
  email: true,
  inApp: true,
};

/**
 * Returns a preference row for every event type, defaulting any event type
 * the user has never saved a preference for to the schema defaults (both
 * channels on) rather than omitting it — the settings form always renders
 * a complete, deterministic set of toggles.
 */
export async function getNotificationPreferences(
  prisma: PrismaClient,
  userId: string
): Promise<NotificationPreferenceValue[]> {
  const rows: Array<{ eventType: string; email: boolean; inApp: boolean }> =
    await prisma.notificationPreference.findMany({ where: { userId } });
  const byEventType = new Map(rows.map((row) => [row.eventType, row]));

  return NOTIFICATION_EVENT_TYPES.map((eventType) => {
    const row = byEventType.get(eventType);
    return {
      eventType,
      email: row?.email ?? DEFAULTS.email,
      inApp: row?.inApp ?? DEFAULTS.inApp,
    };
  });
}

/**
 * Upserts a user's notification preferences. Only recognized event types
 * (NOTIFICATION_EVENT_TYPES) are written — unknown values are silently
 * dropped rather than rejected, so the form can always submit its full,
 * fixed set of toggles.
 */
export async function saveNotificationPreferences(
  prisma: PrismaClient,
  userId: string,
  preferences: NotificationPreferenceValue[]
): Promise<void> {
  const valid = preferences.filter((p) =>
    (NOTIFICATION_EVENT_TYPES as readonly string[]).includes(p.eventType)
  );

  await prisma.$transaction(
    valid.map((p) =>
      prisma.notificationPreference.upsert({
        where: { userId_eventType: { userId, eventType: p.eventType } },
        create: { userId, eventType: p.eventType, email: p.email, inApp: p.inApp },
        update: { email: p.email, inApp: p.inApp },
      })
    )
  );
}
