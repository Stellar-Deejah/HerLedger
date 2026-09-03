import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { auth } from "@/lib/auth/server";

import { middleware } from "../middleware";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/server", () => ({
  auth: {
    api: {
      getSession: vi.fn(),
    },
  },
}));
// The locale passthrough (next-intl's createMiddleware) is exercised
// end-to-end by the running app; here it's replaced with a pass-through so
// these tests stay focused on the auth-protection logic, and to avoid
// resolving next's subpath modules inside vitest.
vi.mock("next-intl/middleware", () => ({
  default: () => () => new Response(null, { status: 200 }),
}));

const ORIGIN = "https://app.herledger.example";

function requestFor(path: string, sessionToken?: string): NextRequest {
  const request = new NextRequest(new URL(path, ORIGIN));
  if (sessionToken) {
    request.cookies.set("better-auth.session_token", sessionToken);
  }
  return request;
}

const MOCK_SESSION = {
  session: { id: "sess_1", userId: "u_1" },
  user: { id: "u_1", email: "user@example.com" },
} as never;

describe("middleware", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("redirects an unauthenticated request for a protected route to sign-in", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const response = await middleware(requestFor("/dashboard"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/auth/sign-in");
    expect(location.searchParams.get("callbackUrl")).toBe("/dashboard");
  });

  it("calls auth.api.getSession() with the request headers for a protected route, not just a cookie check", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(MOCK_SESSION);

    const request = requestFor("/dashboard", "some-cookie-value");
    await middleware(request);

    expect(auth.api.getSession).toHaveBeenCalledTimes(1);
    expect(auth.api.getSession).toHaveBeenCalledWith({ headers: request.headers });
  });

  it("allows an authenticated request through to a protected route", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(MOCK_SESSION);

    const response = await middleware(requestFor("/dashboard", "valid-session"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("rejects a request carrying a forged/tampered session cookie (fails cryptographic validation)", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const response = await middleware(requestFor("/dashboard", "forged.cookie.value"));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/sign-in");
  });

  it("rejects a request carrying a session token that was revoked in the DB", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const response = await middleware(requestFor("/dashboard", "revoked-session-token"));

    expect(response.status).toBe(307);
    expect(new URL(response.headers.get("location")!).pathname).toBe("/auth/sign-in");
  });

  it("redirects an authenticated request away from the sign-in page to /dashboard by default", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(MOCK_SESSION);

    const response = await middleware(requestFor("/auth/sign-in", "valid-session"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/dashboard");
  });

  it("redirects an authenticated request away from the sign-up page", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(MOCK_SESSION);

    const response = await middleware(requestFor("/auth/sign-up", "valid-session"));

    expect(response.status).toBe(307);
    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/dashboard");
  });

  it("honors a valid same-origin callbackUrl when redirecting an authenticated user off the sign-in page", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(MOCK_SESSION);

    const response = await middleware(
      requestFor("/auth/sign-in?callbackUrl=%2Fdashboard%2Factivity", "valid-session")
    );

    const location = new URL(response.headers.get("location")!);
    expect(location.pathname).toBe("/dashboard/activity");
  });

  it("allows an unauthenticated request through to the sign-in page", async () => {
    vi.mocked(auth.api.getSession).mockResolvedValueOnce(null);

    const response = await middleware(requestFor("/auth/sign-in"));

    expect(response.headers.get("location")).toBeNull();
  });

  it("allows an unauthenticated request through to an unprotected route without hitting the session layer", async () => {
    const response = await middleware(requestFor("/"));

    expect(response.headers.get("location")).toBeNull();
    expect(auth.api.getSession).not.toHaveBeenCalled();
  });

  const maliciousCallbackUrls: Array<[label: string, payload: string]> = [
    ["protocol-relative URL", "//evil.com"],
    ["absolute URL to a foreign origin", "https://evil.com"],
    ["javascript: scheme", "javascript:alert(1)"],
    ["URL-encoded protocol-relative URL", "%2F%2Fevil.com"],
    ["backslash-based protocol-relative URL", "/\\evil.com"],
    ["data: scheme", "data:text/html,<script>alert(1)</script>"],
  ];

  it.each(maliciousCallbackUrls)(
    "silently drops a malicious callbackUrl on sign-in redirect (%s)",
    async (_label, payload) => {
      vi.mocked(auth.api.getSession).mockResolvedValueOnce(MOCK_SESSION);

      const response = await middleware(
        requestFor(`/auth/sign-in?callbackUrl=${encodeURIComponent(payload)}`, "valid-session")
      );

      const location = new URL(response.headers.get("location")!);
      expect(location.origin).toBe(ORIGIN);
      expect(location.pathname).toBe("/dashboard");
    }
  );
});
