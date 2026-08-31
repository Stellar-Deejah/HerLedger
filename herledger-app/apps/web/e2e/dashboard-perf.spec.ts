import { test, expect } from "@playwright/test";

import {
  addSessionCookie,
  cleanupSeed,
  disconnectSeedClient,
  seedAuthenticatedUser,
} from "./helpers/seed";

// ---------------------------------------------------------------------------
// Informational timing capture for issue #11's RSC migration (per-widget
// data now loads server-side during SSR instead of via a post-hydration
// client fetch). This is NOT a CI gate: Lighthouse/timing numbers are
// notoriously noisy across sandboxes and CI runners, so a hard threshold
// here would flake on infra variance rather than catch real regressions --
// real before/after numbers (this branch vs. main, run locally against a
// production build) are reported in the PR description instead.
//
// "TTFMP" from the issue's acceptance criteria isn't an actual browser API
// -- "First Meaningful Paint" was a Lighthouse-only heuristic Google
// deprecated years ago in favor of LCP, and was never a Paint Timing API
// entry. This measures the two real signals available: first-contentful-
// paint (the actual Paint Timing API entry) and a custom "time to widget
// content visible" duration (page.goto -> the widget's real rendered
// content appearing). FCP alone can fire on the static page shell before a
// Suspense-streamed widget resolves -- exactly the waterfall this issue is
// fixing -- so FCP alone wouldn't show the improvement this migration makes.
// ---------------------------------------------------------------------------

interface RouteCase {
  path: string;
  label: string;
  /** Real rendered content unique to this widget once its data resolves (the empty-state case needs no seeded rows). */
  contentText: string;
}

const ROUTES: RouteCase[] = [
  { path: "/dashboard", label: "Overview", contentText: "No verified financial activity yet." },
  { path: "/dashboard/activity", label: "Activity", contentText: "No financial activity yet." },
  { path: "/dashboard/attestations", label: "Attestations", contentText: "No attestations yet." },
];

test.afterAll(async () => {
  await disconnectSeedClient();
});

for (const { path, label, contentText } of ROUTES) {
  test(`${label} (${path}): time to widget content + first-contentful-paint`, async ({
    page,
    context,
    baseURL,
  }) => {
    const { userId, sessionToken } = await seedAuthenticatedUser();
    await addSessionCookie(context, sessionToken, baseURL ?? "http://localhost:3000");

    const start = Date.now();
    await page.goto(path);
    await expect(page.getByText(contentText)).toBeVisible();
    const timeToContentMs = Date.now() - start;

    const firstContentfulPaintMs = await page.evaluate(() => {
      const entry = performance
        .getEntriesByType("paint")
        .find((e) => e.name === "first-contentful-paint");
      return entry?.startTime ?? null;
    });

    await test.info().attach(`${label}-timing`, {
      body: JSON.stringify({ path, timeToContentMs, firstContentfulPaintMs }, null, 2),
      contentType: "application/json",
    });
    console.log(
      `[perf] ${label} (${path}): time-to-content=${timeToContentMs}ms FCP=${firstContentfulPaintMs ?? "n/a"}ms`
    );

    await cleanupSeed(userId);
  });
}
