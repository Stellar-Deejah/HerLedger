import { StrKey } from "@stellar/stellar-sdk";
import { describe, it, expect, beforeAll, vi } from "vitest";

vi.mock("server-only", () => ({}));

// `server.ts` reads all server env vars at module load time (via
// getServerEnv()), so they must be set before the module is imported. We
// import it dynamically inside beforeAll rather than statically at the top
// of the file so this file's own top-level code runs first.
let auth: (typeof import("../server.js"))["auth"];

beforeAll(async () => {
  const contractId = StrKey.encodeContract(Buffer.alloc(32));
  Object.assign(process.env, {
    NODE_ENV: "test",
    APP_URL: "http://localhost:3000",
    DATABASE_URL: process.env["DATABASE_URL"] ?? "postgresql://herledger:herledger@localhost:5432/herledger_test",
    BETTER_AUTH_SECRET: "test-secret-must-be-at-least-32-characters-long",
    DATABASE_URL: "postgresql://herledger:herledger@localhost:5432/herledger_test",
    BETTER_AUTH_SECRET: "05fddafc9c2b3b1a6a57ab04d3677c73f59779b7ba60aaf931a38672f93ccc78",
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

  ({ auth } = await import("../server.js"));
}, 30000);

// Better Auth 1.6.28 has no `csrf` config option; sign-in/sign-up carry
// `formCsrfMiddleware` (see api/middlewares/origin-check.mjs), which rejects
// requests using the browser's own Fetch Metadata headers (Sec-Fetch-Site/
// Mode/Dest — these cannot be forged by a cross-origin attacker page) and,
// for any request that does carry Origin/Referer, validates it against
// `trustedOrigins`. Both are exercised here against the actual exported
// `auth` instance, so this test also verifies our `trustedOrigins`
// configuration (currently just `[APP_URL]`) is doing its job — a
// misconfiguration there would make these requests pass.
describe("auth CSRF protection (sign-in/email)", () => {
  it("rejects a cross-site top-level form navigation (classic CSRF form-post attack)", async () => {
    const request = new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "sec-fetch-site": "cross-site",
        "sec-fetch-mode": "navigate",
        "sec-fetch-dest": "document",
        "x-forwarded-for": `198.51.100.${Math.floor(Math.random() * 200) + 1}`,
      },
      body: JSON.stringify({ email: "victim@example.com", password: "irrelevant123" }),
    });

    const response = await auth.handler(request);

    expect(response.status).toBe(403);
  });

  it("rejects a cross-origin XHR/fetch POST carrying an untrusted Origin header", async () => {
    const request = new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "https://attacker.example",
        "sec-fetch-site": "cross-site",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        "x-forwarded-for": `203.0.113.${Math.floor(Math.random() * 200) + 1}`,
      },
      body: JSON.stringify({ email: "victim@example.com", password: "irrelevant123" }),
    });

    const response = await auth.handler(request);

    expect(response.status).toBe(403);
  });

  it("does not reject solely for same-origin Sec-Fetch metadata (sanity check on the assertions above)", async () => {
    const request = new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        origin: "http://localhost:3000",
        "sec-fetch-site": "same-origin",
        "sec-fetch-mode": "cors",
        "sec-fetch-dest": "empty",
        "x-forwarded-for": `192.0.2.${Math.floor(Math.random() * 200) + 1}`,
      },
      body: JSON.stringify({ email: "nobody@example.com", password: "irrelevant123" }),
    });

    const response = await auth.handler(request);

    // Same-origin requests must clear the CSRF layer; whatever happens next
    // (e.g. 401 for unknown credentials against the unreachable test DB) is
    // a different concern, but it must not be blocked as cross-origin (403
    // with FORBIDDEN specifically indicates the CSRF/origin-check layer).
    expect(response.status).not.toBe(403);
  });
});
