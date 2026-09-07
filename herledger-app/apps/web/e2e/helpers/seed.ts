import { createHmac, randomBytes } from "node:crypto";

import type { BrowserContext } from "@playwright/test";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Real-data seeding for e2e specs that exercise a page's server-rendered
// (RSC) data path.
//
// Why this exists: page.route() intercepts fetch() calls made *from the
// browser*. Once a page fetches its initial data server-side during SSR
// (see app/dashboard/{page,activity/page,attestations/page}.tsx), there's
// no browser-initiated request left for page.route() to intercept — the
// only way to control what a real SSR render sees is to put real rows in
// the database it queries. This seeds directly via Prisma against the same
// Postgres the app itself uses (CI already runs a Postgres service and
// `pnpm db:migrate` before the test job — see .github/workflows/ci.yml).
//
// The session cookie can't be a plain token string either: better-auth
// signs it as `${rawToken}.${base64(HMAC-SHA256(secret, rawToken))}` (see
// better-call's context.mjs/crypto.mjs) and verifies that signature before
// ever touching the DB. signSessionToken reproduces that exact scheme so a
// DB-seeded Session row authenticates like a real sign-in would.
// ---------------------------------------------------------------------------

const databaseUrl = process.env["DATABASE_URL"];
if (!databaseUrl) {
  throw new Error("DATABASE_URL is not set — required to seed e2e fixtures directly via Prisma.");
}

const prisma = new PrismaClient({ adapter: new PrismaPg(databaseUrl) });

function signSessionToken(rawToken: string): string {
  const secret = process.env["BETTER_AUTH_SECRET"];
  if (!secret) {
    throw new Error("BETTER_AUTH_SECRET is not set — required to sign a valid session cookie.");
  }
  const signature = createHmac("sha256", secret).update(rawToken).digest("base64");
  return `${rawToken}.${signature}`;
}

function hex(bytes: number): string {
  return randomBytes(bytes).toString("hex");
}

export interface SeededUser {
  userId: string;
  /** Signed cookie value — pass directly as the `better-auth.session_token` cookie's value. */
  sessionToken: string;
}

export async function seedAuthenticatedUser(): Promise<SeededUser> {
  const user = await prisma.user.create({
    data: { email: `e2e-${hex(6)}@example.com`, emailVerified: true, name: "E2E User" },
  });

  const rawToken = hex(32);
  await prisma.session.create({
    data: {
      userId: user.id,
      token: rawToken,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    },
  });

  return { userId: user.id, sessionToken: signSessionToken(rawToken) };
}

export async function addSessionCookie(
  context: BrowserContext,
  sessionToken: string,
  url: string
): Promise<void> {
  await context.addCookies([{ name: "better-auth.session_token", value: sessionToken, url }]);
}

export interface SeededBusiness {
  businessId: string;
}

export async function seedBusinessProfile(
  userId: string,
  overrides: Partial<{ displayName: string; active: boolean }> = {}
): Promise<SeededBusiness> {
  const businessId = hex(32);
  await prisma.businessProfile.create({
    data: {
      userId,
      businessId,
      walletAddress: `G${hex(28).toUpperCase().slice(0, 55)}`,
      displayName: overrides.displayName ?? "E2E Test Business",
      metadataHash: hex(32),
      active: overrides.active ?? true,
    },
  });
  return { businessId };
}

export interface SeededFinancialEvent {
  eventId: string;
}

export async function seedFinancialEvent(
  businessId: string,
  overrides: Partial<{
    eventType: "PaymentReceived" | "PaymentSent" | "InvoiceSettled" | "CommitmentFulfilled";
    status: "Pending" | "Verified" | "Disputed" | "Revoked";
    amount: string;
    ledgerSequence: number;
  }> = {}
): Promise<SeededFinancialEvent> {
  const eventId = hex(32);
  await prisma.financialEvent.create({
    data: {
      businessId,
      eventId,
      eventType: overrides.eventType ?? "PaymentReceived",
      assetAddress: "native",
      amount: overrides.amount ?? "10000000",
      stellarReference: hex(32),
      metadataHash: hex(32),
      status: overrides.status ?? "Verified",
      ledgerSequence: overrides.ledgerSequence ?? 100,
    },
  });
  return { eventId };
}

export async function seedAttestation(
  eventId: string,
  overrides: Partial<{
    status: "Active" | "Revoked";
    claimDescription: string | null;
    claimHash: string;
    attesterAddress: string;
    ledgerSequence: number;
  }> = {}
): Promise<{ attestationId: string }> {
  const attestationId = hex(32);
  await prisma.attestation.create({
    data: {
      attestationId,
      eventId,
      attesterAddress: overrides.attesterAddress ?? `G${hex(28).toUpperCase().slice(0, 55)}`,
      claimHash: overrides.claimHash ?? hex(32),
      claimDescription: overrides.claimDescription ?? null,
      status: overrides.status ?? "Active",
      ledgerSequence: overrides.ledgerSequence ?? 90,
    },
  });
  return { attestationId };
}

/**
 * Deletes a seeded user's rows in FK-safe order. `BusinessProfile`/
 * `FinancialEvent` use `onDelete: Restrict` against `User`/`BusinessProfile`
 * respectively, so those must be deleted before the user — only `Session`
 * cascades automatically.
 */
export async function cleanupSeed(userId: string): Promise<void> {
  const business = await prisma.businessProfile.findUnique({
    where: { userId },
    select: { businessId: true },
  });

  if (business) {
    await prisma.attestation.deleteMany({
      where: { event: { businessId: business.businessId } },
    });
    await prisma.financialEvent.deleteMany({ where: { businessId: business.businessId } });
    await prisma.businessProfile.delete({ where: { userId } });
  }

  await prisma.user.delete({ where: { id: userId } });
}

export async function disconnectSeedClient(): Promise<void> {
  await prisma.$disconnect();
}
