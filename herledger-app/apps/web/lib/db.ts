import { PrismaClient } from "@prisma/client";

// ---------------------------------------------------------------------------
// Prisma singleton for the Next.js application.
//
// Problem: Next.js hot-module replacement in development re-executes every
// module on each file save.  Without a guard, every save creates a new
// PrismaClient, each of which opens its own connection pool.  Ten saves ->
// ten pools -> connection exhaustion within minutes.
//
// Solution: store the single instance on the Node.js `globalThis` object,
// which survives HMR reloads.  In production, module-level caching is
// sufficient, but the global guard is harmless there.
//
// This pattern is the official Prisma recommendation for Next.js:
// https://www.prisma.io/docs/guides/other/troubleshooting-orm/help-articles/nextjs-prisma-client-dev-practices
// ---------------------------------------------------------------------------

const globalForPrisma = globalThis as unknown as {
  __prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const client = new PrismaClient({
    log:
      process.env["NODE_ENV"] === "development"
        ? ["query", "warn", "error"]
        : ["warn", "error"],
  });
  return client;
}

// Re-use the existing instance (HMR-safe) or create a new one.
export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? createPrismaClient();

// Pin the instance to `globalThis` in non-production environments only.
// In production, the process is long-lived and module caching is sufficient.
if (process.env["NODE_ENV"] !== "production") {
  globalForPrisma.__prisma = prisma;
}
