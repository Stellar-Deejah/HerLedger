import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { auth } from "@/lib/auth/server";
import { validateCallbackUrl } from "@/lib/auth/validate-callback-url";

// ---------------------------------------------------------------------------
// Route protection middleware
// Redirect unauthenticated users away from dashboard routes.
//
// Session validation architecture (see SECURITY.md for the full writeup):
//
// - `auth.api.getSession()` is called on every protected request. This is a
//   cryptographic + DB-backed check (Better Auth verifies the session
//   cookie's signature and, on a cache miss, looks the session up in
//   Postgres) — not a bare cookie-presence check. A forged or tampered
//   cookie fails signature verification and is treated as unauthenticated.
//
// - Next.js 16 runs this file's request handler on the Node.js runtime by
//   default (Proxy — the successor to Middleware — defaults to Node.js as of
//   v16; see node_modules/next/dist/docs/01-app/03-api-reference/
//   03-file-conventions/proxy.md, "Runtime" + "Version history" sections).
//   That means the Prisma-backed Better Auth adapter configured in
//   lib/auth/server.ts works here unmodified — there is no Edge runtime
//   restriction to design around, and no separate edge-compatible auth
//   client or route-handler proxy is needed.
//
// - Better Auth's `cookieCache` (lib/auth/server.ts) is the "short-lived
//   session cache" called for by the hardening plan: a short-TTL signed,
//   encrypted cookie holding session + user data, checked before Postgres is
//   queried. This bounds DB round-trips to roughly one per TTL window
//   instead of one per request, keeping this middleware's added latency
//   low. The trade-off: a session revoked directly in the DB (not via
//   Better Auth's own sign-out/revoke API, which also clears the cache
//   cookie) can remain accepted at the edge for up to the cache TTL. The
//   TTL was deliberately shortened from 7 days to 30 seconds so that window
//   is small rather than eliminated — see the comment in lib/auth/server.ts.
// ---------------------------------------------------------------------------

// Forces Node.js runtime explicitly rather than relying on whatever Next.js
// defaults to for this file -- the comment above claims v16 defaults here
// to Node already (citing a doc path that doesn't exist in this
// node_modules), but this repo's actual dev server compiles this file for
// the Edge runtime, which can't resolve the workspace packages' .ts source
// files the way the Node bundle can. See @herledger/config's Prisma-backed
// auth.api.getSession() call below, which needs Node.js regardless.
export const runtime = "nodejs";

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_ROUTES = ["/auth/sign-in", "/auth/sign-up"];

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const appUrl = process.env.APP_URL || "http://localhost:3000";

  // CORS preflight handling for /api/ routes
  if (pathname.startsWith("/api/")) {
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": appUrl,
          "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers":
            "Content-Type, Authorization, X-Requested-With, x-admin-token",
          "Access-Control-Allow-Credentials": "true",
        },
      });
    }

    // Add deprecation header for unversioned API routes
    if (!pathname.startsWith("/api/v1/") && !pathname.startsWith("/api/openapi.json")) {
      const response = NextResponse.next();
      response.headers.set("Deprecation", "true");
      response.headers.set("Link", '</api/v1>; rel="successor-version"');
      return response;
    }

    return NextResponse.next();
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

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
