import { getServerEnv } from "@herledger/config/server";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getServerEnv } from "@herledger/config";
import { prisma } from "@/lib/db";

import { getPrismaClient } from "@/lib/db/client";
import { sendVerificationEmail } from "@/lib/email/verification";

// ---------------------------------------------------------------------------
// Better Auth server instance
// Application auth is separate from Stellar wallet connection.
//
// Uses the shared Prisma singleton from lib/db so that Better Auth and the
// API routes all share one connection pool and HMR in dev does not open a
// new pool on every file save.
// ---------------------------------------------------------------------------

const env = getServerEnv();

export const auth = betterAuth({
  database: prismaAdapter(getPrismaClient(), {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.APP_URL,
  emailAndPassword: {
    enabled: true,
    // Confirmed empirically (see PR description): with this on, sign-up
    // does not issue a session (no Set-Cookie) until the email is
    // verified, and sign-in for an unverified user is rejected with a
    // distinct EMAIL_NOT_VERIFIED error rather than creating one. There is
    // no code path that hands an unverified user a session cookie, so the
    // existing cookie-presence check in middleware.ts already keeps them
    // out of /dashboard without needing its own emailVerified check --
    // app/dashboard/layout.tsx still re-checks it server-side (see that
    // file) as defense in depth against a future change to this behavior.
    requireEmailVerification: true,
    minPasswordLength: 12,
  },
  emailVerification: {
    sendOnSignUp: true,
    // Refreshes the token (and re-sends) on a sign-in attempt against an
    // unverified account, so a user who lost the original email isn't
    // stuck waiting for the resend button specifically.
    sendOnSignIn: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendVerificationEmail(user.email, url);
    },
  },
  rateLimit: {
    enabled: true,
    // DB-backed rather than in-memory: this app has no other reason to run
    // a shared cache (Redis/Upstash) yet, and an in-memory counter is
    // per-process -- wrong the moment this runs as more than one instance
    // (multiple serverless invocations, or any horizontally-scaled
    // deployment), since each instance would maintain its own count and a
    // credential-stuffing attacker could round-robin across instances to
    // dodge the limit entirely. Postgres is already the source of truth
    // for everything else in this app; reusing it here needs no new infra.
    storage: "database",
    customRules: {
      // 5 attempts / 15 minutes, matching the issue's acceptance criteria.
      "/sign-in/email": { window: 900, max: 5 },
      // The resend-verification-email button (app/auth/verify-email) hits
      // this same endpoint sendOnSignUp/sendOnSignIn use internally --
      // without its own limit it'd be a mail-bombing vector against
      // whatever address is typed into the "email" field.
      "/send-verification-email": { window: 900, max: 3 },
    },
  },
  session: {
    // The cookie cache is a short-TTL signed & encrypted cookie holding the
    // session/user payload, checked by `auth.api.getSession()` before it
    // falls back to a Postgres lookup. It's what keeps `middleware.ts`'s
    // per-request session check cheap (see the middleware's own comment for
    // the full picture).
    //
    // The TTL is the direct trade-off between latency and revocation
    // freshness: a session revoked out-of-band (directly in the DB, not via
    // Better Auth's own revoke/sign-out endpoints, which also clear this
    // cookie) stays valid at the edge for up to `maxAge` after the cache was
    // last populated. 7 days — the previous value — made that window
    // unacceptably large for a security boundary. 30 seconds keeps
    // out-of-band revocation propagating in effectively "the next request or
    // two" while still avoiding a DB round trip on every single navigation.
    cookieCache: {
      enabled: true,
      maxAge: 30, // 30 seconds short-lived Edge cache window
    },
  },
  trustedOrigins: [env.APP_URL],
  advanced: {
    // Better Auth has no `csrf` option — CSRF protection is the
    // Origin/Referer + Fetch Metadata check in its origin-check middleware,
    // and it is on by default. BUT that middleware auto-disables itself
    // whenever NODE_ENV === "test" (see @better-auth/core's `isTest()`),
    // which is exactly what CI sets for the whole test job. Force it on
    // explicitly so a `test` NODE_ENV can never silently turn off CSRF
    // protection in this app, in CI or otherwise.
    disableOriginCheck: false,
    // Rate limiting (and session IP recording) key off the resolved client
    // IP. Without this, Better Auth can't reliably read it from behind a
    // proxy (Vercel, or any reverse proxy) and every client collapses onto
    // one shared bucket -- confirmed empirically: omitting this made 6
    // sign-in attempts from 3 different test IPs all land in the same
    // rate-limit counter. x-forwarded-for is what Vercel/Next.js set.
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for"],
    },
  },
});

export type Auth = typeof auth;
