import AxeBuilder from "@axe-core/playwright";
import { test as base, expect, type Page } from "@playwright/test";

import {
  addSessionCookie,
  cleanupSeed,
  disconnectSeedClient,
  seedAuthenticatedUser,
} from "./helpers/seed";

const test = base;

// ---------------------------------------------------------------------------
// axe-core sweep of every /dashboard route (issue #8 acceptance criteria).
//
// Overview, Activity, and Attestations (below, in their own describe block)
// were converted to Server Components by issue #11's RSC migration — their
// initial data now loads during SSR via a real auth.api.getSession() +
// Prisma call, not a browser-side fetch(), so page.route()-based session/
// data mocking can no longer reach them (a fake, unsigned session cookie
// fails better-auth's signature check server-side, and the resulting
// redirect-to-sign-in collides with middleware's "already have a cookie"
// redirect-back-to-dashboard check, producing ERR_TOO_MANY_REDIRECTS).
// These three seed a real session + rows via ./helpers/seed instead, the
// same way e2e/attestations.spec.ts does.
//
// Business, Disputes, Settings, and the pre-wallet-connection Attestation
// pages are unaffected by that migration (still client-fetched, or don't
// fetch at all) and keep the original fixture/mockSession approach.
//
// Scope: fails the build on "critical" or "serious" impact violations, which
// is what the issue asks for. "moderate"/"minor" findings aren't asserted on
// here — see the PR description for known gaps that still need manual
// screen-reader verification.
// ---------------------------------------------------------------------------

const SESSION_FIXTURE = {
  user: {
    id: "e2e-user",
    email: "e2e-user@example.com",
    name: "E2E User",
    emailVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  session: {
    id: "e2e-session",
    userId: "e2e-user",
    expiresAt: new Date(Date.now() + 86_400_000).toISOString(),
  },
};

// DashboardNav opens an SSE connection on every /dashboard/* route via
// useEventStream; keep it inert rather than leaving it to hit the real
// (unmocked) endpoint on the dev server. Needed by both describe blocks
// below regardless of how the session itself is set up.
async function mockEventStream(page: Page) {
  await page.route("**/api/events/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      body: ":\n\n",
    });
  });
}

async function mockSession(page: Page) {
  await page.context().addCookies([
    {
      name: "better-auth.session_token",
      value: "e2e-fixture-session",
      url: process.env.APP_URL ?? "http://localhost:3000",
    },
  ]);
  await page.route("**/api/auth/get-session", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(SESSION_FIXTURE),
    });
  });
  await mockEventStream(page);
}

async function runAxe(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();

  const seriousOrCritical = results.violations.filter(
    (violation) => violation.impact === "critical" || violation.impact === "serious"
  );

  expect(
    seriousOrCritical,
    seriousOrCritical
      .map(
        (v) =>
          `${v.id} (${v.impact}): ${v.help}\n${v.nodes.map((n) => n.target.join(" ")).join(", ")}`
      )
      .join("\n\n")
  ).toEqual([]);
}

test.describe("Dashboard accessibility (axe-core)", () => {
  test.beforeEach(async ({ page }) => {
    await mockSession(page);
  });

  test("business profile registration form has no critical/serious violations", async ({
    page,
  }) => {
    await page.route("**/api/business/current", async (route) => {
      await route.fulfill({ status: 404, contentType: "application/json", body: "{}" });
    });

    await page.goto("/dashboard/business");
    await expect(page.getByRole("heading", { name: "Register your business" })).toBeVisible();
    await runAxe(page);
  });

  test("business profile (registered) has no critical/serious violations", async ({ page }) => {
    await page.route("**/api/business/current", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          business: {
            id: "b".repeat(64),
            name: "Acme Co",
            metadataHash: "m".repeat(64),
            active: true,
            owner: "GOWNERAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
            wallet: "GWALLETAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA",
          },
        }),
      });
    });

    await page.goto("/dashboard/business");
    await expect(page.getByRole("heading", { name: "Business Profile" })).toBeVisible();
    await runAxe(page);
  });

  test("disputes list has no critical/serious violations", async ({ page }) => {
    await page.route("**/api/activity/recent*", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            events: [
              {
                id: "d1",
                eventId: "e".repeat(64),
                eventType: "PaymentReceived",
                amount: "10000000",
                status: "Verified",
                stellarReference: "t".repeat(64),
                ledgerSequence: 100,
              },
            ],
          },
        }),
      });
    });

    await page.goto("/dashboard/disputes");
    await expect(page.getByRole("heading", { name: "Disputes" })).toBeVisible();
    await runAxe(page);
  });

  test("settings panel has no critical/serious violations", async ({ page }) => {
    await page.goto("/dashboard/settings");
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
    await runAxe(page);
  });

  test("settings panel delete-account confirmation form has no critical/serious violations", async ({
    page,
  }) => {
    await page.goto("/dashboard/settings");
    await page.getByRole("button", { name: "Delete Account" }).click();
    await expect(page.getByLabel("Confirm Password")).toBeVisible();
    await runAxe(page);
  });

  test("attester registration page has no critical/serious violations", async ({ page }) => {
    await page.goto("/dashboard/attestations/register");
    await expect(page.getByRole("heading", { name: "Register attester" })).toBeVisible();
    await runAxe(page);
  });

  test("create attestation page has no critical/serious violations", async ({ page }) => {
    await page.goto("/dashboard/attestations/create");
    await expect(page.getByRole("heading", { name: "Create attestation" })).toBeVisible();
    await runAxe(page);
  });
});

interface RscFixtures {
  seededUser: { userId: string };
}

const rscTest = base.extend<RscFixtures>({
  seededUser: async ({ context, baseURL, page }, provide) => {
    const { userId, sessionToken } = await seedAuthenticatedUser();
    await addSessionCookie(context, sessionToken, baseURL ?? "http://localhost:3000");
    await mockEventStream(page);

    await provide({ userId });

    await cleanupSeed(userId);
  },
});

rscTest.describe("Dashboard accessibility (axe-core) — RSC routes", () => {
  rscTest.afterAll(async () => {
    await disconnectSeedClient();
  });

  rscTest(
    "dashboard summary has no critical/serious violations",
    async ({ page, seededUser: _u }) => {
      await page.goto("/dashboard");
      await expect(page.getByRole("heading", { name: "Dashboard" })).toBeVisible();
      await runAxe(page);
    }
  );

  rscTest(
    "financial activity list has no critical/serious violations",
    async ({ page, seededUser: _u }) => {
      await page.goto("/dashboard/activity");
      await expect(page.getByRole("heading", { name: "Financial Activity" })).toBeVisible();
      await runAxe(page);
    }
  );

  rscTest(
    "attestations list has no critical/serious violations",
    async ({ page, seededUser: _u }) => {
      await page.goto("/dashboard/attestations");
      await expect(page.getByRole("heading", { name: "Attestations" })).toBeVisible();
      await runAxe(page);
    }
  );
});
