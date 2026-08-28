import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { logger, dbQueryDurationSeconds } from "../observability/index.js";

// ---------------------------------------------------------------------------
// Singleton Prisma client for the indexer process.
// ---------------------------------------------------------------------------

const DEFAULT_STATEMENT_TIMEOUT_MS = 10_000;

// Connection pool sizing for the indexer's concurrency profile.
//
// The default pg pool used by `@prisma/adapter-pg` is sized for low-concurrency
// workloads; under a high-volume sync batch (e.g. catching up 10,000 ledgers)
// it can exhaust the pool and queue queries, slowing the sync job down or
// timing it out. We therefore configure the pool explicitly:
//
// - `DB_CONNECTION_LIMIT` (default 10): maximum number of concurrent
//   connections the indexer holds. The sync job is single-writer (one
//   `syncCycle` at a time), so 10 is a deliberate balance: it lets a batch
//   of `createMany`/`$transaction` writes overlap without reserving more
//   connections than the workload can actually use. Raise it only if you
//   observe pool exhaustion in the sync job; lower it on a shared database.
// - `DB_POOL_TIMEOUT_MS` (default 10_000): how long a query waits for a free
//   connection before failing, so a busy pool fails fast instead of queuing
//   indefinitely.
const DEFAULT_CONNECTION_LIMIT = 10;
const DEFAULT_POOL_TIMEOUT_MS = 10_000;

/**
 * Builds the DATABASE_URL with a Postgres `statement_timeout` query param
 * attached, so a slow or locked query is killed after a fixed maximum
 * instead of holding a connection (and the pool slot behind it)
 * indefinitely. Override via DB_STATEMENT_TIMEOUT_MS if 10s is too tight
 * or too loose for a given deployment.
 */
function buildDatabaseUrl(): string {
  const raw = process.env["DATABASE_URL"];
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  const url = new URL(raw);
  if (!url.searchParams.has("statement_timeout")) {
    const timeoutMs = process.env["DB_STATEMENT_TIMEOUT_MS"]
      ? Number(process.env["DB_STATEMENT_TIMEOUT_MS"])
      : DEFAULT_STATEMENT_TIMEOUT_MS;
    url.searchParams.set("statement_timeout", String(timeoutMs));
  }
  return url.toString();
}

// A named factory (rather than inlining `new PrismaClient(...)` at the call
// site) lets `_prisma`'s declared type keep the specific `log` array's
// generic instantiation, which is what makes `$on("warn" | "error" |
// "query", ...)` type-check below -- a bare `PrismaClient` annotation
// erases it back to its default (`never` events).
function createPrismaClient() {
  return new PrismaClient({
    adapter: new PrismaPg({
      connectionString: buildDatabaseUrl(),
      max: process.env["DB_CONNECTION_LIMIT"]
        ? Number(process.env["DB_CONNECTION_LIMIT"])
        : DEFAULT_CONNECTION_LIMIT,
      connectionTimeoutMillis: process.env["DB_POOL_TIMEOUT_MS"]
        ? Number(process.env["DB_POOL_TIMEOUT_MS"])
        : DEFAULT_POOL_TIMEOUT_MS,
    }),
    log: [
      { emit: "event", level: "query" } as const,
      { emit: "event", level: "warn" } as const,
      { emit: "event", level: "error" } as const,
    ],
  });
}

let _prisma: ReturnType<typeof createPrismaClient> | null = null;

export function getPrismaClient(): PrismaClient {
  if (!_prisma) {
    const isDev = process.env["NODE_ENV"] === "development";

    _prisma = createPrismaClient();

    _prisma.$on("warn", (e: { message: string }) => {
      logger.warn({ event: "prisma-warn", message: e.message }, "Prisma client warning");
    });

    // A statement_timeout hit surfaces as a Postgres error on the query.
    // Log it distinctly so timed-out queries are easy to find/alert on,
    // including the elapsed time Prisma reports for the failed query.
    _prisma.$on("error", (e: { message: string; target?: unknown }) => {
      const isTimeout = /statement timeout|canceling statement/i.test(e.message);
      logger.error(
        {
          event: isTimeout ? "prisma-query-timeout" : "prisma-error",
          message: e.message,
          target: e.target,
        },
        isTimeout ? "Prisma statement timeout" : "Prisma client error"
      );
    });

    _prisma.$on("query", (e: { query: string; duration: number }) => {
      // Record query duration into Prometheus histogram (duration in seconds)
      dbQueryDurationSeconds.observe({ operation: "prisma_query" }, e.duration / 1000);

      if (isDev) {
        logger.debug(
          {
            event: "prisma-query",
            query: e.query,
            durationMs: e.duration,
          },
          "Prisma query executed"
        );
      }
    });
  }
  return _prisma;
}

export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}