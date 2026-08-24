import { defineConfig, devices } from "@playwright/test";

// ---------------------------------------------------------------------------
// Minimal Playwright config — this is the first E2E suite in apps/web
// (previously `pnpm test:e2e` had no config to run against; see README.md's
// "pnpm test:e2e" line). Specs intercept API/RPC calls via `page.route()`
// rather than depending on a live Postgres + Stellar RPC, so `pnpm dev`
// booting with syntactically valid env vars is enough to run this suite.
// ---------------------------------------------------------------------------
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "dot" : "list",
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: process.env.APP_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
