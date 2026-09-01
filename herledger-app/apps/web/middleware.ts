import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth/server";
import { validateCallbackUrl } from "@/lib/auth/validate-callback-url";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_ROUTES = ["/auth/sign-in", "/auth/sign-up"];

function generateNonce(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2);
}

function buildCsp(nonce: string): string {
  return `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'; style-src 'self' 'unsafe-inline'; img-src 'self' blob: data:; font-src 'self'; connect-src 'self'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self';`;
}

function applySecurityHeaders(response: NextResponse, nonce?: string): NextResponse {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (nonce) {
    response.headers.set("Content-Security-Policy", buildCsp(nonce));
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
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

  const allowedOrigins = [appUrl, request.nextUrl.origin];
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.includes(pathname);

  // Only pay for a session lookup when the route actually cares about auth
  // state — public routes skip it entirely.
  if (!isProtected && !isAuthRoute) {
    return NextResponse.next();
  }

  const session = await auth.api.getSession({ headers: request.headers });

  if (isProtected && !session) {
    const signIn = new URL("/auth/sign-in", request.url);
    const callbackTarget = `${pathname}${search}`;
    const safeCallback = validateCallbackUrl(callbackTarget, allowedOrigins);
    signIn.searchParams.set("callbackUrl", safeCallback ?? "/dashboard");
    return NextResponse.redirect(signIn);
  }

  if (isAuthRoute && session) {
    const requestedCallback = request.nextUrl.searchParams.get("callbackUrl");
    const safeCallback = validateCallbackUrl(requestedCallback, allowedOrigins);
    return NextResponse.redirect(new URL(safeCallback ?? "/dashboard", request.url));
  }

  // On auth routes when not logged in, drop malicious callbackUrl parameter if present
  if (isAuthRoute && !session) {
    const requestedCallback = request.nextUrl.searchParams.get("callbackUrl");
    if (requestedCallback !== null) {
      const safeCallback = validateCallbackUrl(requestedCallback, allowedOrigins);
      if (!safeCallback) {
        const cleanAuthUrl = new URL(pathname, request.url);
        return NextResponse.redirect(cleanAuthUrl);
      }
    }
  }

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
