import { randomUUID } from "node:crypto";

import { StrKey } from "@stellar/stellar-sdk";
import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

// See server.csrf.test.ts for why this is a dynamic import inside
// beforeAll rather than a static top-level one: server.ts reads env vars
// via getServerEnv() at module load time.
let auth: (typeof import("../server.js"))["auth"];

beforeAll(async () => {
  const contractId = StrKey.encodeContract(Buffer.alloc(32));
  Object.assign(process.env, {
    NODE_ENV: "production",
    APP_URL: "http://localhost:3000",
    DATABASE_URL:
      process.env["DATABASE_URL"] ??
      "postgresql://herledger:herledger@localhost:5432/herledger_test",
    BETTER_AUTH_SECRET: "test-secret-must-be-at-least-32-characters-long",
    RESEND_API_KEY: "test-resend-key",
    EMAIL_FROM: "HerLedger <test@herledger.test>",
    STELLAR_NETWORK: "testnet",
    STELLAR_RPC_URL: "https://soroban-testnet.stellar.org",
    STELLAR_HORIZON_URL: "https://horizon-testnet.stellar.org",
    STELLAR_NETWORK_PASSPHRASE: "Test SDF Network ; September 2015",
    BUSINESS_REGISTRY_CONTRACT_ID: contractId,
    FINANCIAL_LEDGER_CONTRACT_ID: contractId,
    ATTESTATION_REGISTRY_CONTRACT_ID: contractId,
    INDEXER_API_URL: "http://localhost:4000",
  });

  // NODE_ENV is forced to "production" above (rather than the "test" this
  // suite otherwise runs under) because Better Auth's rate limiter is only
  // enabled by default in production -- this exercises the real deployed
  // behavior, not a test-only bypass.
  ({ auth } = await import("../server.js"));
}, 30000);

function signInRequest(ip: string, password = "wrong-password-123") {
  return new Request("http://localhost:3000/api/auth/sign-in/email", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      origin: "http://localhost:3000",
      "sec-fetch-site": "same-origin",
      // Rate limiting keys off the resolved client IP (see
      // advanced.ipAddress.ipAddressHeaders in server.ts) -- a fresh,
      // never-reused IP per test keeps these independent of each other and
      // of any other suite that exercises sign-in against the same DB.
      "x-forwarded-for": ip,
    },
    body: JSON.stringify({ email: "nobody@example.com", password }),
  });
}

describe("sign-in rate limiting (5 attempts / 15 min, DB-backed)", () => {
  it("allows 5 failed attempts through and locks out the 6th with 429 + Retry-After", async () => {
    const ip = `198.51.100.${Math.floor(Math.random() * 200) + 1}`;

    for (let i = 0; i < 5; i++) {
      const res = await auth.handler(signInRequest(ip));
      expect(res.status, `attempt ${i + 1} should not be rate-limited yet`).not.toBe(429);
    }

    const lockedOut = await auth.handler(signInRequest(ip));
    expect(lockedOut.status).toBe(429);
    // Better Auth's own header is `x-retry-after` (confirmed against the
    // real response; not documented) -- app/api/auth/[...all]/route.ts
    // mirrors it onto the standard `Retry-After` for any caller that only
    // understands that one. Both are asserted here so a change to either
    // layer is caught.
    expect(lockedOut.headers.get("x-retry-after")).toBe("900");
  });

  it("does not lock out a different IP sharing no history with a locked-out one", async () => {
    const lockedIp = `192.0.2.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < 6; i++) {
      await auth.handler(signInRequest(lockedIp));
    }
    const stillLocked = await auth.handler(signInRequest(lockedIp));
    expect(stillLocked.status).toBe(429);

    const freshIp = `203.0.113.${Math.floor(Math.random() * 200) + 1}`;
    const freshAttempt = await auth.handler(signInRequest(freshIp));
    expect(freshAttempt.status).not.toBe(429);
  });

  it("lifts the lockout once the 15-minute window has elapsed", async () => {
    const ip = `198.18.0.${Math.floor(Math.random() * 200) + 1}`;
    for (let i = 0; i < 6; i++) {
      await auth.handler(signInRequest(ip));
    }
    const lockedOut = await auth.handler(signInRequest(ip));
    expect(lockedOut.status).toBe(429);

    // Simulate the window elapsing by backdating the DB-backed counter's
    // lastRequest past the 900s window, rather than waiting 15 real
    // minutes or mocking Date.now() globally (which better-auth's own
    // compiled dist code wouldn't observe consistently) -- same fixture
    // strategy as prisma/data-migrations tests use for time-based state.
    const { getPrismaClient } = await import("@/lib/db/client");
    const prisma = getPrismaClient();
    const updated = await prisma.rateLimit.updateMany({
      where: { key: `${ip}|/sign-in/email` },
      data: { lastRequest: BigInt(Date.now() - 901_000) },
    });
    expect(updated.count).toBeGreaterThan(0);

    const afterExpiry = await auth.handler(signInRequest(ip));
    expect(afterExpiry.status).not.toBe(429);
  });
});

describe("password length enforcement (server-side)", () => {
  it("rejects a sign-up with a password shorter than the 12-character minimum", async () => {
    const res = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "sec-fetch-site": "same-origin",
          "x-forwarded-for": `10.0.0.${Math.floor(Math.random() * 200) + 1}`,
        },
        body: JSON.stringify({
          email: `${randomUUID()}@example.com`,
          password: "short123", // 8 chars, below the 12-char minimum
          name: "Too Short",
        }),
      })
    );

    expect(res.status).toBe(400);
    const json = (await res.json()) as { code?: string };
    expect(json.code).toBe("PASSWORD_TOO_SHORT");
  });

  it("accepts a sign-up with a 12+ character password", async () => {
    const res = await auth.handler(
      new Request("http://localhost:3000/api/auth/sign-up/email", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          origin: "http://localhost:3000",
          "sec-fetch-site": "same-origin",
          "x-forwarded-for": `10.0.1.${Math.floor(Math.random() * 200) + 1}`,
        },
        body: JSON.stringify({
          email: `${randomUUID()}@example.com`,
          password: "long-enough-password",
          name: "Long Enough",
        }),
      })
    );

    expect(res.status).toBe(200);
  });
});
