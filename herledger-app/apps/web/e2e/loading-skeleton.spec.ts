import { test, expect } from "@playwright/test";

import {
  addSessionCookie,
  cleanupSeed,
  disconnectSeedClient,
  seedAuthenticatedUser,
} from "./helpers/seed";

// ---------------------------------------------------------------------------
// Verifies the dashboard loading skeleton (loading.tsx) appears during a
// slow-network route transition, then is replaced by the real content.
//
// The /dashboard route is an RSC segment: its page fetches a session and a
// business profile server-side (auth.api.getSession + Prisma) before its own
// <Suspense> resolves the overview data. The segment's loading.tsx is the
// fallback Next.js streams first, so on a slow connection the skeleton is a
// visually anchored placeholder while the page's payload trickles in.
//
// We emulate "slow network" via CDP network throttling (Chromium) rather than
// page.route(): the SSR data path never issues a browser fetch() for
// page.route() to intercept — it happens on the server during render, exactly
// the scenario the skeleton exists to mask.
//
// Navigation is started but not awaited before observing the skeleton: with a
// streamed HTML response, `page.goto` only resolves once the stream has
// finished (i.e. content has already rendered), so we must assert the skeleton
// *while* the navigation is in flight.
// ---------------------------------------------------------------------------

test.afterAll(async () => {
  await disconnectSeedClient();
});

test("overview route shows a content-shaped skeleton under slow-network, then swaps in content", async ({
  page,
  context,
  baseURL,
}) => {
  const { userId, sessionToken } = await seedAuthenticatedUser();
  await addSessionCookie(context, sessionToken, baseURL ?? "http://localhost:3000");

  // Keep the dashboard SSE feed quiet so no real-time overlay races the
  // skeleton or the empty-state content it replaces.
  await page.route("**/api/events/stream", async (route) => {
    await route.fulfill({
      status: 200,
      headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache" },
      body: ":\n\n",
    });
  });

  const client = await context.newCDPSession(page);
  await client.send("Network.enable");
  await client.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 1_000,
    downloadThroughput: 150_000, // ~150 kB/s — a sizable delay for a small RSC payload
    uploadThroughput: 150_000,
  });

  try {
    const navigation = page.goto("/dashboard", { waitUntil: "load", timeout: 90_000 });

    // While the (throttled) page payload streams, the loading skeleton must be
    // the visible fallback — the spatial shape (KPI cards + activity table)
    // is rendered from the Skeleton* primitives (class="skeleton").
    await page.locator(".skeleton").first().waitFor({ state: "visible", timeout: 15_000 });

    await navigation;

    // The skeleton must be replaced by real content once the stream resolves.
    await expect(page.getByText("No verified financial activity yet.")).toBeVisible({
      timeout: 30_000,
    });

    // Skeleton should no longer be present once content is in the DOM.
    await expect(page.locator(".skeleton").first()).toHaveCount(0);
  } finally {
    await cleanupSeed(userId);
  }
});
