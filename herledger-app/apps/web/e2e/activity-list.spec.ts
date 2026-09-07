import { test, expect } from "@playwright/test";

import {
  addSessionCookie,
  cleanupSeed,
  disconnectSeedClient,
  seedAuthenticatedUser,
  seedBusinessProfile,
  seedFinancialEvent,
} from "./helpers/seed";

// ---------------------------------------------------------------------------
// Verifies the ActivityList virtualization path: when a page is larger than
// the 100-row threshold, only the visible rows (+ overscan) are rendered into
// the DOM rather than the whole page. The first page is server-rendered (see
// ActivityListServer) so a real business + a few seeded rows make the table
// appear; page-size changes beyond 20 go through the client's
// GET /api/v1/activity/recent call, which is intercepted here with a
// deterministic 200-row page so the assertion runs without Postgres seeding
// 200 rows.
// ---------------------------------------------------------------------------

function makeEvent(index: number) {
  const id = `evt-${index}`;
  return {
    id,
    eventId: id,
    eventType: "PaymentReceived",
    assetAddress: "native",
    amount: (10_000_000n + BigInt(index)).toString(),
    status: "Verified",
    stellarReference: `0x${id.padStart(62, "0")}`,
    ledgerSequence: 100_000 - index,
  };
}

test.afterAll(async () => {
  await disconnectSeedClient();
});

test("virtualizes large pages so the DOM row count stays bounded", async ({
  page,
  context,
  baseURL,
}) => {
  const { userId, sessionToken } = await seedAuthenticatedUser();
  const { businessId } = await seedBusinessProfile(userId);
  await seedFinancialEvent(businessId, { ledgerSequence: 100 });

  try {
    await addSessionCookie(context, sessionToken, baseURL ?? "http://localhost:3000");

    // Page-size changes beyond the SSR'd page-0 (limit 20) hit the v1 API from
    // the browser, so those are interceptable — serve a 200-row page so the
    // virtualization path is exercised without seeding 200 DB rows.
    await page.route("**/api/v1/activity/recent*", async (route) => {
      const url = new URL(route.request().url());
      const limit = Number(url.searchParams.get("limit") ?? "20");
      const events = Array.from({ length: limit }, (_, i) => makeEvent(i));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { events, pagination: { offset: 0, limit, count: limit } },
          error: null,
        }),
      });
    });

    // Keep the SSE stream quiet so no overlay events interfere with the count.
    await page.route("**/api/v1/events/stream", async (route) => {
      await route.fulfill({
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
        body: "",
      });
    });

    await page.goto("/dashboard/activity");

    // Default page size (20) renders the plain table.
    await expect(page.getByRole("table", { name: "Financial activity" })).toBeVisible();

    // Grow the page past the virtualization threshold.
    await page.selectOption("#activity-page-size", "200");

    // The virtualized container uses role="table" (a div) and renders only the
    // visible + overscan rows, never the full 200.
    await expect(page.locator('div[role="table"][aria-label="Financial activity"]')).toBeVisible();

    const rowCount = await page.locator('[role="row"]').count();
    expect(rowCount).toBeGreaterThan(1); // header + at least one visible row
    expect(rowCount).toBeLessThan(100); // far below the 200 fetched events
  } finally {
    await cleanupSeed(userId);
  }
});
