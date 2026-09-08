import { randomUUID } from "node:crypto";

import { test, expect } from "@playwright/test";

import { cleanupSeed, disconnectSeedClient } from "./helpers/seed";

// ---------------------------------------------------------------------------
// Covers the #13 acceptance criteria that are reachable through the UI:
// required email verification, the resend flow, and the sign-in lockout.
// Password-length/lockout-trigger/lockout-expiry unit coverage against the
// real Better Auth handler lives in lib/auth/__tests__/rate-limit.test.ts --
// this suite exercises the same behavior through SignUpForm/SignInForm/
// VerifyEmailPanel instead, since that's what actually regresses if a future
// change to those components breaks the wiring to Better Auth's client.
//
// Uses real sign-up/sign-in against the seeded Postgres (no Freighter or
// Soroban RPC involved in any of this, unlike business-registration.spec.ts)
// -- a fresh, random email per test, cleaned up afterward via
// cleanupSeed(userId) once the created user's id is known from the sign-up
// response.
// ---------------------------------------------------------------------------

test.afterAll(async () => {
  await disconnectSeedClient();
});

function uniqueEmail(): string {
  return `e2e-auth-${randomUUID()}@example.com`;
}

test.describe("Sign-up: password policy and email verification", () => {
  test("a password under 12 characters is rejected client-side, before any request is sent", async ({
    page,
  }) => {
    await page.goto("/auth/sign-up");

    await page.getByLabel("Your name").fill("Too Short");
    await page.getByLabel("Email").fill(uniqueEmail());
    await page.getByLabel("Password", { exact: true }).fill("short12345"); // 10 chars
    await page.getByRole("button", { name: "Create account" }).click();

    await expect(page.getByRole("alert")).toHaveText(/at least 12 characters/i);
    // Still on the sign-up page -- no navigation happened.
    await expect(page).toHaveURL(/\/auth\/sign-up$/);
  });

  test("a valid password shows the live strength meter", async ({ page }) => {
    await page.goto("/auth/sign-up");

    await expect(page.getByText(/password strength/i)).not.toBeVisible();
    await page.getByLabel("Password", { exact: true }).fill("a");
    await expect(page.getByText(/password strength/i)).toBeVisible();
  });

  test("signing up redirects to the verify-email screen, not the dashboard", async ({ page }) => {
    const email = uniqueEmail();

    await page.goto("/auth/sign-up");
    await page.getByLabel("Your name").fill("Verify Me");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("a-plenty-long-password");

    const signUpResponse = page.waitForResponse(
      (res) => res.url().includes("/api/auth/sign-up/email") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create account" }).click();
    const res = await signUpResponse;
    const json = (await res.json()) as { user?: { id: string } };
    const userId = json.user?.id;

    await expect(page).toHaveURL(
      new RegExp(`/auth/verify-email\\?email=${encodeURIComponent(email)}`)
    );
    await expect(page.getByText(email)).toBeVisible();
    await expect(page.getByRole("button", { name: /resend verification email/i })).toBeVisible();

    if (userId) await cleanupSeed(userId);
  });
});

test.describe("Sign-in: unverified account", () => {
  test("signing in against an unverified account shows a resend-verification prompt", async ({
    page,
  }) => {
    const email = uniqueEmail();
    const password = "a-plenty-long-password";

    // Create the (unverified) account first via the real sign-up flow.
    await page.goto("/auth/sign-up");
    await page.getByLabel("Your name").fill("Unverified User");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill(password);
    const signUpResponse = page.waitForResponse(
      (res) => res.url().includes("/api/auth/sign-up/email") && res.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Create account" }).click();
    const json = (await (await signUpResponse).json()) as { user?: { id: string } };
    const userId = json.user?.id;

    // Now attempt to sign in with the same (correct) credentials.
    await page.goto("/auth/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: "Sign in" }).click();

    await expect(page.getByRole("alert")).toHaveText(/verify your email/i);
    const resendLink = page.getByRole("link", { name: /resend verification email/i });
    await expect(resendLink).toHaveAttribute(
      "href",
      `/auth/verify-email?email=${encodeURIComponent(email)}`
    );

    if (userId) await cleanupSeed(userId);
  });
});

test.describe("Sign-in: rate limiting", () => {
  test("5 consecutive failed sign-in attempts lock out the 6th with a rate-limit response", async ({
    page,
  }) => {
    await page.goto("/auth/sign-in");

    // A single browser session naturally shares one client identity across
    // these submissions (same real connection, no proxy involved), so this
    // exercises the same per-caller counter lib/auth/__tests__/rate-limit.test.ts
    // verifies directly against the handler.
    for (let i = 0; i < 5; i++) {
      await page.getByLabel("Email").fill("nobody@example.com");
      await page.getByLabel("Password").fill(`wrong-password-${i}`);
      const res = page.waitForResponse(
        (r) => r.url().includes("/api/auth/sign-in/email") && r.request().method() === "POST"
      );
      await page.getByRole("button", { name: "Sign in" }).click();
      const response = await res;
      expect(response.status(), `attempt ${i + 1} should not be rate-limited yet`).not.toBe(429);
      await expect(page.getByRole("alert")).toBeVisible();
    }

    await page.getByLabel("Email").fill("nobody@example.com");
    await page.getByLabel("Password").fill("wrong-password-6");
    const lockedOutResponse = page.waitForResponse(
      (r) => r.url().includes("/api/auth/sign-in/email") && r.request().method() === "POST"
    );
    await page.getByRole("button", { name: "Sign in" }).click();
    const response = await lockedOutResponse;

    expect(response.status()).toBe(429);
    expect(response.headers()["retry-after"]).toBeTruthy();
  });
});
