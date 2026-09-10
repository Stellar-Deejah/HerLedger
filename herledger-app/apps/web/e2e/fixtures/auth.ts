import { createHmac } from "node:crypto";

import { test as base } from "./db";

function signSessionToken(rawToken: string): string {
  const secret =
    process.env["BETTER_AUTH_SECRET"] ||
    "05fddafc9c2b3b1a6a57ab04d3677c73f59779b7ba60aaf931a38672f93ccc78";
  const signature = createHmac("sha256", secret).update(rawToken).digest("base64");
  return `${rawToken}.${signature}`;
}

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

    // 2. Set the cookie in the browser context with cryptographic HMAC signature
    await page.context().addCookies([
      {
        name: "better-auth.session_token",
        value: signSessionToken(sessionToken),
        url: process.env.APP_URL ?? "http://localhost:3000",
      },
    ]);

    // 3. Provide the page to the test
    await use();
  },
});

export { expect } from "@playwright/test";
