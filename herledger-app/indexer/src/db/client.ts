import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { logger, dbQueryDurationSeconds } from "../observability/index.js";

// ---------------------------------------------------------------------------
// Singleton Prisma client for the indexer process.
//
// A single PrismaClient is created on first use and reused for the lifetime
// of the process.  The module-level variable is the canonical instance;
// there is no need for a global object guard in the indexer because Node.js
// module caching already guarantees one module copy per process.
// ---------------------------------------------------------------------------

const DEFAULT_STATEMENT_TIMEOUT_MS = 10_000;

// Startup retry configuration — tunable via environment variables.
const CONNECT_MAX_RETRIES = Number(process.env["DB_CONNECT_MAX_RETRIES"] ?? 5);
const CONNECT_RETRY_DELAY_MS = Number(process.env["DB_CONNECT_RETRY_DELAY_MS"] ?? 2_000);
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

/**
 * Attempt to establish a live database connection, retrying up to
 * CONNECT_MAX_RETRIES times with CONNECT_RETRY_DELAY_MS back-off between
 * attempts.  If all retries are exhausted the function throws; callers
 * should treat this as a fatal startup failure and exit with a non-zero
 * code so the container orchestrator can restart the pod.
 *
 * This deliberately calls $connect() rather than waiting for the first
 * query so that the process fails fast on misconfiguration or a temporary
 * database outage instead of silently queueing work.
 */
export async function connectWithRetry(): Promise<void> {
  const prisma = getPrismaClient();
  let lastError: unknown;

  for (let attempt = 1; attempt <= CONNECT_MAX_RETRIES; attempt++) {
    try {
      await prisma.$connect();
      console.log({ event: "db-connected", attempt });
      return;
    } catch (err) {
      lastError = err;
      console.warn({
        event: "db-connect-retry",
        attempt,
        maxRetries: CONNECT_MAX_RETRIES,
        error: err instanceof Error ? err.message : String(err),
      });

      if (attempt < CONNECT_MAX_RETRIES) {
        await sleep(CONNECT_RETRY_DELAY_MS);
      }
    }
  }

  // All retries exhausted — surface the last error as a fatal failure.
  throw new Error(
    `Database unreachable after ${CONNECT_MAX_RETRIES} attempts: ${
      lastError instanceof Error ? lastError.message : String(lastError)
    }`
  );
}

export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
