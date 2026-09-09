import { describe, it, expect, vi } from "vitest";

import {
  NOTIFICATION_EVENT_TYPES,
  getNotificationPreferences,
  saveNotificationPreferences,
} from "../notifications";

function makeFakePrisma(existing: Array<Record<string, unknown>> = []) {
  return {
    notificationPreference: {
      findMany: vi.fn(async ({ where }: { where: { userId: string } }) =>
        existing.filter((row) => row["userId"] === where.userId)
      ),
      upsert: vi.fn(async ({ create }: { create: Record<string, unknown> }) => create),
    },
    $transaction: vi.fn(async (ops: Promise<unknown>[]) => Promise.all(ops)),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("getNotificationPreferences", () => {
  it("defaults every event type to both channels enabled when nothing is saved", async () => {
    const prisma = makeFakePrisma([]);
    const prefs = await getNotificationPreferences(prisma, "user_1");

    expect(prefs).toHaveLength(NOTIFICATION_EVENT_TYPES.length);
    for (const pref of prefs) {
      expect(pref.email).toBe(true);
      expect(pref.inApp).toBe(true);
    }
  });

  it("returns a saved preference for its event type, defaulting the rest", async () => {
    const prisma = makeFakePrisma([
      { userId: "user_1", eventType: "DisputeResolution", email: false, inApp: true },
    ]);

    const prefs = await getNotificationPreferences(prisma, "user_1");
    const disputePref = prefs.find((p) => p.eventType === "DisputeResolution");
    const otherPref = prefs.find((p) => p.eventType === "NewAttestation");

    expect(disputePref).toEqual({ eventType: "DisputeResolution", email: false, inApp: true });
    expect(otherPref).toEqual({ eventType: "NewAttestation", email: true, inApp: true });
  });

  it("always returns exactly the fixed set of event types, in order", async () => {
    const prisma = makeFakePrisma([]);
    const prefs = await getNotificationPreferences(prisma, "user_1");
    expect(prefs.map((p) => p.eventType)).toEqual([...NOTIFICATION_EVENT_TYPES]);
  });
});

describe("saveNotificationPreferences", () => {
  it("upserts every provided preference", async () => {
    const prisma = makeFakePrisma([]);
    await saveNotificationPreferences(prisma, "user_1", [
      { eventType: "NewAttestation", email: false, inApp: true },
      { eventType: "DisputeResolution", email: true, inApp: false },
    ]);

    expect(prisma.notificationPreference.upsert).toHaveBeenCalledTimes(2);
  });

  it("silently drops preferences for unrecognized event types", async () => {
    const prisma = makeFakePrisma([]);
    await saveNotificationPreferences(prisma, "user_1", [
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { eventType: "NotARealEventType" as any, email: true, inApp: true },
    ]);

    expect(prisma.notificationPreference.upsert).not.toHaveBeenCalled();
  });
});
