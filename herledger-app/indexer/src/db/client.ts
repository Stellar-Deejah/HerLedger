import { PrismaClient } from "@prisma/client";

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

let _prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!_prisma) {
    const isDev = process.env["NODE_ENV"] === "development";

    _prisma = new PrismaClient({
      datasourceUrl: buildDatabaseUrl(),
      log: [
        ...(isDev ? [{ emit: "event", level: "query" } as const] : []),
        { emit: "event", level: "warn" },
        { emit: "event", level: "error" },
      ],
    });

    _prisma.$on("warn", (e: { message: string }) => {
      console.warn({ event: "prisma-warn", message: e.message });
    });

    // A statement_timeout hit surfaces as a Postgres error on the query.
    // Log it distinctly so timed-out queries are easy to find/alert on,
    // including the elapsed time Prisma reports for the failed query.
    _prisma.$on("error", (e: { message: string; target?: unknown }) => {
      const isTimeout = /statement timeout|canceling statement/i.test(e.message);
      console.error({
        event: isTimeout ? "prisma-query-timeout" : "prisma-error",
        message: e.message,
        target: e.target,
      });
    });

    if (isDev) {
      _prisma.$on("query", (e: { query: string; duration: number }) => {
        console.log({
          event: "prisma-query",
          query: e.query,
          durationMs: e.duration,
        });
      });
    }
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
