import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getServerEnv } from "@herledger/config/server";

import { getPrismaClient } from "@/lib/db/client";

// ---------------------------------------------------------------------------
// Better Auth server instance
// Application auth is separate from Stellar wallet connection.
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
    requireEmailVerification: false,
  },
  user: {
    additionalFields: {
      // These fields are server-owned. In particular, role must never be
      // writable through Better Auth's public update-user endpoint.
      role: { type: "string", defaultValue: "USER", input: false },
      onboardingCompleted: { type: "boolean", defaultValue: false, input: false },
    },
  },
  session: {
    cookieCache: {
      // Role and onboarding state change server-side. Do not serve a stale
      // cached user payload after business registration or an admin action.
      enabled: false,
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
  },
});

export type Auth = typeof auth;
