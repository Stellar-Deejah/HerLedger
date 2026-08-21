import { NextRequest } from "next/server";
import { describe, it, expect, vi } from "vitest";

import { middleware } from "../middleware";

function requestFor(path: string, sessionToken?: string): NextRequest {
  const request = new NextRequest(new URL(path, "https://app.herledger.example"));
  if (sessionToken) {
    request.cookies.set("better-auth.session_token", sessionToken);
  }
  return request;
}

describe("middleware", () => {
  it("redirects an unauthenticated request for a protected route to sign-in", () => {
    const response = middleware(requestFor("/dashboard"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/auth/sign-in");
    expect(location.searchParams.get("callbackUrl")).toBe("/dashboard");
  });

  it("allows an authenticated request through to a protected route", () => {
    const response = middleware(requestFor("/dashboard", "valid-session"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("redirects an authenticated request away from the sign-in page", () => {
    const response = middleware(requestFor("/auth/sign-in", "valid-session"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/dashboard");
  });

  it("redirects an authenticated request away from the sign-up page", () => {
    const response = middleware(requestFor("/auth/sign-up", "valid-session"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/dashboard");
  });

  it("allows an unauthenticated request through to the sign-in page", () => {
    const response = middleware(requestFor("/auth/sign-in"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows an unauthenticated request through to an unprotected route", () => {
    const response = middleware(requestFor("/"));

    expect(response.headers.get("location")).toBeNull();
  });

  describe("security headers", () => {
    // NODE_ENV is "test" for this whole file (vitest sets it before any
    // module is imported), so middleware.ts's module-level `isProd` is
    // always false here — these assertions cover the headers that don't
    // depend on that branch. Prod-only headers (HSTS, `upgrade-insecure-
    // requests`) are exercised in the "production mode" describe below via
    // a fresh module import with NODE_ENV forced to "production".
    it("sets a per-request CSP with a nonce, and the core hardening headers, on a page response", () => {
      const response = middleware(requestFor("/"));

      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toBeTruthy();
      expect(csp).toMatch(/script-src 'self' 'nonce-[^']+' 'strict-dynamic'/);
      expect(csp).toContain("frame-ancestors 'none'");
      expect(csp).toContain("object-src 'none'");

      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
      expect(response.headers.get("Referrer-Policy")).toBe("strict-origin-when-cross-origin");
      expect(response.headers.get("Permissions-Policy")).toContain("geolocation=()");
    });

    it("uses a fresh nonce per request", () => {
      const first = middleware(requestFor("/"));
      const second = middleware(requestFor("/"));

      const nonceOf = (csp: string | null) => csp?.match(/'nonce-([^']+)'/)?.[1];
      expect(nonceOf(first.headers.get("Content-Security-Policy"))).not.toBe(
        nonceOf(second.headers.get("Content-Security-Policy"))
      );
    });

    it("sets the same headers on an auth redirect response", () => {
      const response = middleware(requestFor("/dashboard"));

      expect(response.status).toBe(307);
      expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("sets the same headers on a versioned API response", () => {
      const request = new NextRequest(new URL("/api/v1/health", "https://app.herledger.example"));
      const response = middleware(request);

      expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
      expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    });

    it("sets the same headers on a CORS preflight response", () => {
      const request = new NextRequest(new URL("/api/v1/health", "https://app.herledger.example"), {
        method: "OPTIONS",
      });
      const response = middleware(request);

      expect(response.status).toBe(204);
      expect(response.headers.get("Content-Security-Policy")).toBeTruthy();
      expect(response.headers.get("X-Frame-Options")).toBe("DENY");
    });

    it("only widens connect-src to the configured Soroban RPC origin", () => {
      const original = process.env["NEXT_PUBLIC_STELLAR_RPC_URL"];
      process.env["NEXT_PUBLIC_STELLAR_RPC_URL"] = "https://soroban-testnet.stellar.org/rpc";

      const response = middleware(requestFor("/"));
      const csp = response.headers.get("Content-Security-Policy");
      expect(csp).toContain("connect-src 'self' https://soroban-testnet.stellar.org");

      process.env["NEXT_PUBLIC_STELLAR_RPC_URL"] = original;
    });
  });
});

describe("middleware in production mode", () => {
  it("adds HSTS and upgrade-insecure-requests, and drops the dev-only CSP relaxations", async () => {
    // `process.env.NODE_ENV` is typed read-only (@types/node) — vi.stubEnv
    // is vitest's sanctioned way to override it for one test, and
    // vi.unstubAllEnvs() restores the original value afterwards.
    vi.stubEnv("NODE_ENV", "production");
    vi.resetModules();

    const { middleware: prodMiddleware } = await import("../middleware");
    const response = prodMiddleware(requestFor("/"));

    expect(response.headers.get("Strict-Transport-Security")).toBe(
      "max-age=63072000; includeSubDomains; preload"
    );
    const csp = response.headers.get("Content-Security-Policy");
    expect(csp).toContain("upgrade-insecure-requests");
    expect(csp).not.toContain("'unsafe-eval'");
    expect(csp).not.toContain("ws:");

    vi.unstubAllEnvs();
    vi.resetModules();
  });
});
