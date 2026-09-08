import { test as base } from "./db";

export const test = base.extend<{
  loggedInPage: void;
}>({
  loggedInPage: async ({ page, db }, use) => {
    // 1. Seed a user and a session in the database
    const userId = "usr_test123";
    const sessionToken = "e2e-fixture-session";

    await db.user.create({
      data: {
        id: userId,
        email: "test@example.com",
        name: "Test User",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    await db.session.create({
      data: {
        id: "sess_123",
        userId,
        token: sessionToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
        createdAt: new Date(),
        updatedAt: new Date(),
        ipAddress: "127.0.0.1",
        userAgent: "Playwright",
      },
    });

    // 2. Set the cookie in the browser context
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: sessionToken,
        url: process.env.APP_URL ?? "http://localhost:3000",
      },
    ]);

    // 3. Provide the page to the test
    await use();
  },
});

export { expect } from "@playwright/test";
