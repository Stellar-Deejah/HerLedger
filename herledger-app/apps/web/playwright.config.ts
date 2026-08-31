import { defineConfig, devices } from "@playwright/test";

// ---------------------------------------------------------------------------
// Playwright E2E config for CI and local development.
//
// CI Environment:
// - Runs in GitHub Actions with PostgreSQL service container
// - Database is migrated before tests run
// - Tests use real PostgreSQL with seeded data via e2e/helpers/seed.ts
// - RPC calls are mocked via page.route() (no real Stellar network needed)
// - Freighter wallet interactions are mocked (tests never require actual wallet signing)
//
// Local Development:
// - Requires `pnpm dev` running locally or uses webServer to start it
// - Uses same database seeding strategy as CI
// - Run with `pnpm test:e2e` from the herledger-app root
// ---------------------------------------------------------------------------
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI
    ? [["dot"], ["html", { outputFolder: "playwright-report" }]]
    : [["list"]],
  use: {
    baseURL: process.env.APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "pnpm dev",
    url: process.env.APP_URL ?? "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      NODE_ENV: "test",
    },
  },
});
