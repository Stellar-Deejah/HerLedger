import { test as base, expect, type Page } from "@playwright/test";

import {
  addSessionCookie,
  cleanupSeed,
  disconnectSeedClient,
  seedAttestation,
  seedAuthenticatedUser,
  seedBusinessProfile,
  seedDispute,
  seedFinancialEvent,
} from "./helpers/seed";
import { ActivityPage } from "./page-objects/ActivityPage";

// ---------------------------------------------------------------------------
// Covers the activity detail drill-down: row click -> detail page, direct
// deep-link navigation, mobile column visibility, and the cross-business
// 404 (not a 403 leak). Uses the same real-DB seeding pattern as the RSC
// routes in accessibility.spec.ts -- the detail page's data fetch happens
// during SSR, so page.route() interception can't reach it.
// ---------------------------------------------------------------------------

async function mockEventStream(page: Page) {
  await page.route("**/api/events/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      body: ":\n\n",
    });
  });
  await page.route("**/api/v1/events/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      body: ":\n\n",
    });
  });
}

interface SeededFixtures {
  seeded: {
    userId: string;
    businessId: string;
    eventId: string;
  };
}

const test = base.extend<SeededFixtures>({
  // Playwright's fixture teardown callback is conventionally named `use`,
  // but that trips react-hooks/rules-of-hooks (it looks like a call to
  // React's `use()`); renamed to `provide` to sidestep it, matching the same
  // workaround already used in accessibility.spec.ts's rscTest fixture.
  seeded: async ({ context, baseURL, page }, provide) => {
    const { userId, sessionToken } = await seedAuthenticatedUser();
    await addSessionCookie(context, sessionToken, baseURL ?? "http://localhost:3000");
    await mockEventStream(page);

    const { businessId } = await seedBusinessProfile(userId);
    const { eventId } = await seedFinancialEvent(businessId, { status: "Disputed" });
    await seedAttestation(eventId, { claimDescription: "Payment for services rendered." });
    await seedDispute(eventId, userId, { reason: "Amount does not match the invoice." });

    await provide({ userId, businessId, eventId });

    await cleanupSeed(userId);
  },
});

test.afterAll(async () => {
  await disconnectSeedClient();
});

test.describe("Activity detail drill-down", () => {
  test("clicking a row navigates to the event detail page", async ({ page, seeded }) => {
    const activityPage = new ActivityPage(page);
    await activityPage.goto();
    await activityPage.clickEvent(seeded.eventId);

    await expect(page).toHaveURL(new RegExp(`/dashboard/activity/${seeded.eventId}$`));
    await expect(page.getByText("Payment for services rendered.")).toBeVisible();
    await expect(page.getByText("Amount does not match the invoice.")).toBeVisible();
    await expect(page.getByRole("link", { name: "View on Stellar Expert" })).toBeVisible();
  });

  test("direct navigation to the detail URL renders the same event", async ({ page, seeded }) => {
    await page.goto(`/dashboard/activity/${seeded.eventId}`);

    await expect(page.getByText("Payment for services rendered.")).toBeVisible();
    await expect(page.getByRole("link", { name: "View on Stellar Expert" })).toBeVisible();
  });

  test("an event belonging to another business 404s instead of leaking a 403", async ({
    page,
    seeded: _seeded,
  }) => {
    const other = await seedAuthenticatedUser();
    const otherBusiness = await seedBusinessProfile(other.userId);
    const { eventId: otherEventId } = await seedFinancialEvent(otherBusiness.businessId);

    const res = await page.goto(`/dashboard/activity/${otherEventId}`);
    expect(res?.status()).toBe(404);

    await cleanupSeed(other.userId);
  });

  test.describe("mobile viewport", () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test("shows only date, type, amount, and status columns", async ({ page, seeded }) => {
      const activityPage = new ActivityPage(page);
      await activityPage.goto();

      const row = await activityPage.getEventRow(seeded.eventId);
      await expect(row).toBeVisible();

      await expect(page.getByRole("columnheader", { name: "Date" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Type" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Amount" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Status" })).toBeVisible();
      await expect(page.getByRole("columnheader", { name: "Ledger" })).toBeHidden();
      await expect(page.getByRole("columnheader", { name: "Stellar ref" })).toBeHidden();

      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const clientWidth = await page.evaluate(() => document.documentElement.clientWidth);
      expect(scrollWidth).toBeLessThanOrEqual(clientWidth + 1);
    });
  });
});
