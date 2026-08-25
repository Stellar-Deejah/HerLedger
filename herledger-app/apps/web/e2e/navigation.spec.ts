import { test, expect } from "@playwright/test";

import {
  addSessionCookie,
  cleanupSeed,
  disconnectSeedClient,
  seedAuthenticatedUser,
} from "./helpers/seed";

// ---------------------------------------------------------------------------
// Covers the responsive dashboard navigation: a persistent sidebar on desktop
// (>= 768px) and a hamburger-triggered drawer on mobile, with the drawer
// closing automatically on route change.
//
// The dashboard pages are server components that check the session during
// SSR, so a real (DB-seeded) Better Auth session cookie is required — the
// same approach as dashboard-perf.spec.ts.
// ---------------------------------------------------------------------------

const seededUserIds: string[] = [];

test.afterAll(async () => {
  for (const userId of seededUserIds) {
    await cleanupSeed(userId);
  }
  await disconnectSeedClient();
});

test.beforeEach(async ({ context, page }) => {
  const { userId, sessionToken } = await seedAuthenticatedUser();
  seededUserIds.push(userId);

  await addSessionCookie(context, sessionToken, process.env.APP_URL ?? "http://localhost:3000");

  // The dashboard widgets' data doesn't need to be exercised for a navigation
  // test — keep the SSE stream quiet so no overlay events interfere.
  await page.route("**/api/v1/events/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream" },
      body: "",
    });
  });
});

test("shows the persistent sidebar on desktop", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/dashboard");

  await expect(page.locator("aside.nav-sidebar")).toBeVisible();
  await expect(page.locator("header.nav-mobile-bar")).toBeHidden();
  await expect(
    page.locator("aside.nav-sidebar").getByRole("link", { name: "Activity" })
  ).toBeVisible();
});

test("opens a drawer via hamburger on mobile and closes it on navigation", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/dashboard");

  await expect(page.locator("aside.nav-sidebar")).toBeHidden();

  const hamburger = page.locator("button[aria-controls='mobile-nav-drawer']");
  await expect(hamburger).toBeVisible();
  await expect(hamburger).toHaveAttribute("aria-expanded", "false");

  await hamburger.click();
  await expect(hamburger).toHaveAttribute("aria-expanded", "true");
  await expect(page.locator("#mobile-nav-drawer")).toHaveClass(/nav-mobile-drawer--open/);

  // Tapping a nav item navigates and closes the drawer automatically.
  await page.locator("#mobile-nav-drawer").getByRole("link", { name: "Activity" }).click();
  await expect(page).toHaveURL(/\/dashboard\/activity/);
  await expect(hamburger).toHaveAttribute("aria-expanded", "false");
});
