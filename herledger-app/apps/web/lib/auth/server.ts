import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { getServerEnv } from "@herledger/config";
import { prisma } from "@/lib/db";

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
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  secret: env.BETTER_AUTH_SECRET,
  baseURL: env.APP_URL,
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
    },
  },
  trustedOrigins: [env.APP_URL],
});

export type Auth = typeof auth;
