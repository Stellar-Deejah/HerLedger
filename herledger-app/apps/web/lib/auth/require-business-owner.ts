import { getPrismaClient } from "@/lib/db/client";

type SessionLike = { user: { id: string } } | null;

type BusinessProfileReader = {
  businessProfile: {
    findUnique: (args: {
      where: { userId: string };
      select: { businessId: true };
    }) => Promise<{ businessId: string } | null>;
  };
};

export type BusinessOwnershipResult =
  | { ok: true; businessId: string }
  | { ok: false; status: 401 | 403; code: "UNAUTHORIZED" | "NO_BUSINESS" | "FORBIDDEN"; message: string };

/**
 * Establishes the authenticated caller's business context and, when a
 * businessId is supplied, verifies that it belongs to that caller.
 *
 * ADMIN is deliberately not a bypass: administrative reads need their own
 * explicit audit-authorized policy rather than silently widening ownership.
 */
export async function requireBusinessOwner(
  session: SessionLike,
  requestedBusinessId?: string,
  db: BusinessProfileReader = getPrismaClient()
): Promise<BusinessOwnershipResult> {
  if (!session) {
    return { ok: false, status: 401, code: "UNAUTHORIZED", message: "Not authenticated" };
  }

  const profile = await db.businessProfile.findUnique({
    where: { userId: session.user.id },
    select: { businessId: true },
  });
  if (!profile) {
    return { ok: false, status: 403, code: "NO_BUSINESS", message: "Complete business registration first" };
  }
  if (requestedBusinessId && profile.businessId !== requestedBusinessId) {
    return { ok: false, status: 403, code: "FORBIDDEN", message: "You do not own this business" };
  }

  return { ok: true, businessId: profile.businessId };
}
