import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import createMiddleware from "next-intl/middleware";

import { routing } from "@/i18n/routing";
import { auth } from "@/lib/auth/server";
import { validateCallbackUrl } from "@/lib/auth/validate-callback-url";

// ---------------------------------------------------------------------------
// Route protection middleware (composed with next-intl locale routing)
//
// Order of operations:
//  1. /api/* requests are handled entirely here (CORS preflight +
//     deprecation headers) and never reach the intl middleware.
//  2. Auth checks run against the locale-*stripped* pathname so a single
//     set of protected/auth route prefixes covers both `/dashboard` (en,
//     unprefixed under `localePrefix: "as-needed"`) and `/es/dashboard`.
//  3. next-intl's middleware runs last: it detects the locale, redirects
//     when the prefix is missing/redundant, and stamps the resolved locale
//     onto the request for the [locale] segment.
//
// Session validation architecture: see SECURITY.md. `auth.api.getSession()`
// is a cryptographic + DB-backed check (Better Auth verifies the session
// cookie signature and, on cache miss, looks the session up in Postgres) —
// not a bare cookie-presence check. A forged or tampered cookie fails
// signature verification and is treated as unauthenticated.
//
// Next.js 16 runs this file's request handler on the Node.js runtime by
// default (Proxy — the successor to Middleware — defaults to Node.js as of
// v16), so the Prisma-backed Better Auth adapter configured in
// lib/auth/server.ts works here unmodified. Better Auth's `cookieCache`
// bounds DB round-trips to roughly one per 30s TTL window (see the comment
// in lib/auth/server.ts).
// ---------------------------------------------------------------------------

const intlMiddleware = createMiddleware(routing);

const PROTECTED_PREFIXES = ["/dashboard"];
const AUTH_ROUTES = ["/auth/sign-in", "/auth/sign-up"];

/**
 * Returns the locale-independent pathname and the active locale for a
 * request. Under `localePrefix: "as-needed"` only non-default locales carry
 * a `/es`-style prefix, so an unprefixed path is always the default locale.
 */
function localeAwarePath(pathname: string): { path: string; locale: string } {
  const [, firstSegment] = pathname.split("/");
  if (
    firstSegment &&
    firstSegment !== routing.defaultLocale &&
    routing.locales.includes(firstSegment as never)
  ) {
    const rest = pathname.slice(firstSegment.length + 1);
    return { path: rest.length === 0 ? "/" : rest, locale: firstSegment };
  }
  return { path: pathname, locale: routing.defaultLocale };
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
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

  const allowedOrigins = [request.nextUrl.origin];
  const { path, locale } = localeAwarePath(pathname);

  const isProtected = PROTECTED_PREFIXES.some((prefix) => path.startsWith(prefix));
  const isAuthRoute = AUTH_ROUTES.includes(path);

  // Only pay for a session lookup when the route actually cares about auth
  // state — public routes skip it entirely.
  if (!isProtected && !isAuthRoute) {
    return intlMiddleware(request);
  }

  const session = await auth.api.getSession({ headers: request.headers });

  // Locale-prefixed redirect target, e.g. "/auth/sign-in" (en) or
  // "/es/auth/sign-in" (es). Keep the original (locale-prefixed) pathname as
  // the callback target so a non-default-locale user lands back in their
  // locale after signing in.
  const localizedPath = (href: string) =>
    locale === routing.defaultLocale ? href : `/${locale}${href}`;

  if (isProtected && !session) {
    const signIn = new URL(localizedPath("/auth/sign-in"), request.url);
    const callbackTarget = `${pathname}${request.nextUrl.search}`;
    const safeCallback = validateCallbackUrl(callbackTarget, allowedOrigins);
    signIn.searchParams.set("callbackUrl", safeCallback ?? "/dashboard");
    return NextResponse.redirect(signIn);
  }

  if (isAuthRoute && session) {
    const requestedCallback = request.nextUrl.searchParams.get("callbackUrl");
    const safeCallback = validateCallbackUrl(requestedCallback, allowedOrigins);
    return NextResponse.redirect(new URL(safeCallback ?? localizedPath("/dashboard"), request.url));
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
