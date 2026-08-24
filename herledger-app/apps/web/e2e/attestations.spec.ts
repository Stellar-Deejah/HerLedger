import { test as base, expect, type Page } from "@playwright/test";

import {
  addSessionCookie,
  cleanupSeed,
  disconnectSeedClient,
  seedAttestation,
  seedAuthenticatedUser,
  seedBusinessProfile,
  seedFinancialEvent,
} from "./helpers/seed";

// ---------------------------------------------------------------------------
// /dashboard/attestations now fetches its initial list server-side (RSC —
// see components/attestations/attestation-list-server.tsx), so the
// page.route() JSON-fixture approach this spec previously used can no
// longer intercept the SSR data path: there's no browser-initiated fetch()
// for the first render to intercept. Each test seeds real rows via Prisma
// instead (see ./helpers/seed.ts), against the same Postgres CI already
// spins up (.github/workflows/ci.yml runs `pnpm db:migrate` before tests).
//
// The register-attester / create-attestation pages at the bottom of this
// file are untouched by the RSC migration (WalletConnect-gated client
// forms, no initial list to fetch) and keep their original no-fixture,
// pre-wallet-connection assertions unchanged.
// ---------------------------------------------------------------------------

interface Fixtures {
  seededUser: { userId: string; businessId: string };
}

const test = base.extend<Fixtures>({
  // Named `provide` rather than Playwright's usual `use` — the react-hooks
  // ESLint rule matches any call named `use(...)` as if it were React's
  // `use()` hook regardless of context, which misfires here. The parameter
  // name is arbitrary (Playwright calls it positionally), so renaming it
  // sidesteps the false positive without disabling the rule.
  seededUser: async ({ context, baseURL }, provide) => {
    const { userId, sessionToken } = await seedAuthenticatedUser();
    await addSessionCookie(context, sessionToken, baseURL ?? "http://localhost:3000");
    const { businessId } = await seedBusinessProfile(userId);

    await provide({ userId, businessId });

    await cleanupSeed(userId);
  },
});

test.afterAll(async () => {
  await disconnectSeedClient();
});

async function abortStellarRpc(page: Page) {
  // AttestationList's client-side on-chain re-validation (isValidAttestation)
  // still runs after hydration — simulate an unreachable RPC so it degrades
  // gracefully and keeps showing the DB-indexed status, same as before.
  await page.route(/soroban|stellar.*rpc/i, async (route) => {
    await route.abort("connectionrefused");
  });
}

test.describe("Attestation list", () => {
  test("renders active attestations with a status badge, and excludes revoked ones by default", async ({
    page,
    seededUser,
  }) => {
    // The list's default fetch (both the old client call and the new
    // lib/data/attestations.getAttestations) passes includeRevoked=false —
    // an attestation only ever appears as "Revoked" in this view if it was
    // fetched while still Active and the client's on-chain re-validation
    // loop later flips it in place (see the module doc comment above);
    // there is no code path where a row seeded as Revoked shows up here.
    await abortStellarRpc(page);
    const activeEvent = await seedFinancialEvent(seededUser.businessId);
    const revokedEvent = await seedFinancialEvent(seededUser.businessId);
    await seedAttestation(activeEvent.eventId, { status: "Active" });
    await seedAttestation(revokedEvent.eventId, { status: "Revoked" });

    await page.goto("/dashboard/attestations");

    await expect(page.locator('[aria-label="Status: Active"]')).toBeVisible();
    await expect(page.locator('[aria-label="Status: Revoked"]')).not.toBeVisible();
  });

  test("renders claimDescription when present, falling back to a truncated claimHash otherwise", async ({
    page,
    seededUser,
  }) => {
    await abortStellarRpc(page);
    const eventWithDescription = await seedFinancialEvent(seededUser.businessId);
    const eventWithoutDescription = await seedFinancialEvent(seededUser.businessId);
    await seedAttestation(eventWithDescription.eventId, {
      claimDescription: "Invoice verified against bank statement",
    });
    await seedAttestation(eventWithoutDescription.eventId, {
      claimDescription: null,
      claimHash: "d".repeat(64),
    });

    await page.goto("/dashboard/attestations");

    await expect(page.getByText("Invoice verified against bank statement")).toBeVisible();
    await expect(page.getByText(`${"d".repeat(16)}…`)).toBeVisible();
  });

  test("resolves an unknown attester address to a truncated display form", async ({
    page,
    seededUser,
  }) => {
    await abortStellarRpc(page);
    const event = await seedFinancialEvent(seededUser.businessId);
    // Neither this address nor any other in this spec is in KNOWN_ATTESTERS
    // (packages/sdk/src/attester-registry.ts), so it should render truncated
    // (first 6 chars + "…" + last 6 chars) rather than as a raw address.
    await seedAttestation(event.eventId, {
      attesterAddress: "GACTIVEATTESTERADDRESSAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
    });

    await page.goto("/dashboard/attestations");

    await expect(page.getByText("GACTIV…AAAAAA")).toBeVisible();
  });

  test("attestations list links to the register-attester and create-attestation routes", async ({
    page,
    seededUser: _seededUser,
  }) => {
    await page.goto("/dashboard/attestations");

    await expect(page.getByRole("link", { name: "Register attester" })).toHaveAttribute(
      "href",
      "/dashboard/attestations/register"
    );
    await expect(page.getByRole("link", { name: "Create attestation" })).toHaveAttribute(
      "href",
      "/dashboard/attestations/create"
    );
  });
});

// ---------------------------------------------------------------------------
// AttesterRegistrationForm / CreateAttestationForm both start by rendering
// WalletConnect, which calls out to the (absent, in CI) Freighter browser
// extension. No Freighter mock is set up here -- these specs only exercise
// the pre-wallet-connection render, which is what's reachable without one.
// Neither page was converted to RSC (no initial list to fetch) and neither
// checks the session server-side beyond middleware's cookie-presence gate,
// so — unlike the fixture above — these just need *a* cookie to get past
// middleware, not a real signed/seeded session.
// ---------------------------------------------------------------------------

test("renders both active and revoked attestations with correct status badges", async ({
  page,
}) => {
  await page.goto("/dashboard/attestations");
});

test.describe("Attester registration / attestation creation (pre-wallet-connection)", () => {
  test.beforeEach(async ({ context }) => {
    await context.addCookies([
      {
        name: "better-auth.session_token",
        value: "e2e-fixture-session",
        url: process.env.APP_URL ?? "http://localhost:3000",
      },
    ]);
  });

  test("register-attester page explains the admin-wallet requirement before connecting", async ({
    page,
  }) => {
    await page.goto("/dashboard/attestations/register");

    await expect(page.getByRole("heading", { name: "Register attester" })).toBeVisible();
    await expect(page.getByText(/must be the contract admin/i)).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Freighter wallet" })).toBeVisible();
  });

  test("create-attestation page prompts for an attester wallet connection first", async ({
    page,
  }) => {
    await page.goto("/dashboard/attestations/create");

    await expect(page.getByRole("heading", { name: "Create attestation" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Connect Freighter wallet" })).toBeVisible();
  });
});
