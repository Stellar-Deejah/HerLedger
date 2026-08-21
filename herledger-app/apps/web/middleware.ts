import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_ROUTES = ["/auth/sign-in", "/auth/sign-up"];

const isProd = process.env.NODE_ENV === "production";

/**
 * A fresh, cryptographically random nonce for this single request. Base64 of
 * 16 random bytes, per the CSP nonce guidance (must be unpredictable and
 * unique per response, never reused).
 */
function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

/**
 * Origins the *browser* needs to reach directly. Horizon and the indexer are
 * only ever called server-side (see lib/stellar/network.ts), so only the
 * public Soroban RPC URL belongs here. Falls back to no extra origin if the
 * env var is unset or unparseable, so a bad value can't silently widen the
 * policy to `connect-src *`.
 */
function rpcConnectSrc(): string[] {
  const raw = process.env.NEXT_PUBLIC_STELLAR_RPC_URL;
  if (!raw) return [];
  try {
    return [new URL(raw).origin];
  } catch {
    return [];
  }
}

function buildCsp(nonce: string): string {
  const scriptSrc = ["'self'", `'nonce-${nonce}'`, "'strict-dynamic'"];
  const connectSrc = ["'self'", ...rpcConnectSrc()];

  // Dev-only relaxations: Fast Refresh needs 'unsafe-eval', and the HMR
  // client holds a websocket open to the dev server. Neither exists in a
  // `next build` production bundle.
  if (!isProd) {
    scriptSrc.push("'unsafe-eval'");
    connectSrc.push("ws:", "wss:");
  }

  const directives = [
    `default-src 'self'`,
    `script-src ${scriptSrc.join(" ")}`,
    // Inline `style={{ ... }}` attributes are used throughout the UI, and
    // CSP has no nonce mechanism for style *attributes* (only <style>
    // elements support 'nonce-'), so style-src needs 'unsafe-inline'. This
    // is a materially narrower exposure than 'unsafe-inline' in script-src
    // would be -- see SECURITY.md for the tradeoff.
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self'`,
    `connect-src ${connectSrc.join(" ")}`,
    `frame-ancestors 'none'`,
    `form-action 'self'`,
    `base-uri 'self'`,
    `object-src 'none'`,
  ];
  if (isProd) directives.push("upgrade-insecure-requests");

  return directives.join("; ");
}

/**
 * Sets the header set common to every response this middleware returns
 * (page, redirect, and API alike), plus the per-request CSP.
 */
function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set("Content-Security-Policy", buildCsp(nonce));
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );
  // HSTS is only meaningful (and only safe to advertise) once the app is
  // actually served over HTTPS -- skip it in dev, where the app runs on
  // plain http://localhost.
  if (isProd) {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=63072000; includeSubDomains; preload"
    );
  }
  return response;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const appUrl = process.env.APP_URL || "http://localhost:3000";
  const nonce = generateNonce();

  // CORS preflight handling for /api/ routes
  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return applySecurityHeaders(
        new NextResponse(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": appUrl,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
            "Access-Control-Allow-Headers":
              "Content-Type, Authorization, X-Requested-With, x-admin-token",
            "Access-Control-Allow-Credentials": "true",
          },
        }),
        nonce
      );
    }

    // Add deprecation header for unversioned API routes
    if (!pathname.startsWith("/api/v1/") && !pathname.startsWith("/api/openapi.json")) {
      const response = NextResponse.next();
      response.headers.set("Deprecation", "true");
      response.headers.set("Link", '</api/v1>; rel="successor-version"');
      return applySecurityHeaders(response, nonce);
    }

    return applySecurityHeaders(NextResponse.next(), nonce);
  }

  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const sessionToken = request.cookies.get("better-auth.session_token");

  if (isProtected && !sessionToken) {
    const signIn = new URL("/auth/sign-in", request.url);
    signIn.searchParams.set("callbackUrl", pathname);
    return applySecurityHeaders(NextResponse.redirect(signIn), nonce);
  }

  if (AUTH_ROUTES.includes(pathname) && sessionToken) {
    return applySecurityHeaders(NextResponse.redirect(new URL("/dashboard", request.url)), nonce);
  }

  // Forward the CSP (and the raw nonce) on the *request* headers, not just
  // the response: Next.js reads the incoming request's Content-Security-Policy
  // header to find the active nonce and automatically applies it to the
  // <script> tags it injects itself (the webpack runtime, the RSC payload,
  // etc.) — see Next.js's strict-CSP guide. Server Components can also read
  // the nonce back out via `headers()` from `next/headers` for any script
  // they render directly.
  const cspHeaderValue = buildCsp(nonce);
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", cspHeaderValue);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  return applySecurityHeaders(response, nonce);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
