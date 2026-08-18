import { buildServer } from "./api/server.js";
import { runSyncJob } from "./jobs/sync-ledger.js";
import { connectWithRetry, disconnectPrisma } from "./db/client.js";

// ---------------------------------------------------------------------------
// Indexer entry point
// Starts the HTTP API server and the ledger sync job concurrently.
// ---------------------------------------------------------------------------

const PORT = Number(process.env["PORT"] ?? 4000);
const HOST = process.env["HOST"] ?? "0.0.0.0";

/**
 * Grace period for in-flight sync batches before a forced exit.
 * Default: 10 000 ms.  Override via SHUTDOWN_GRACE_MS.
 */
const SHUTDOWN_GRACE_MS = Number(process.env["SHUTDOWN_GRACE_MS"] ?? 10_000);

/**
 * Shared shutdown controller.
 *
 * The sync job reads `signal.aborted` at the top of every sleep/cycle so it
 * can stop scheduling new batches as soon as a shutdown signal arrives.
 * `inflightPromise` is set by the sync job to the Promise for the currently
 * running syncCycle() call.  The shutdown handler awaits it (with a timeout)
 * before closing the server so that no upsert is interrupted mid-write.
 */
export const shutdownController = new AbortController();
export let inflightSyncPromise: Promise<void> | null = null;

export function setInflightSyncPromise(p: Promise<void> | null): void {
  inflightSyncPromise = p;
}

async function main(): Promise<void> {
  // --- Startup: verify DB is reachable before accepting traffic ---
  try {
    await connectWithRetry();
  } catch (err) {
    console.error({ event: "fatal-db-unavailable", error: err instanceof Error ? err.message : String(err) });
    process.exit(1);
  }

  const app = buildServer();

  // --- Graceful shutdown sequence ---
  //
  // 1. Signal the sync job to stop scheduling new batches.
  // 2. Wait for the current in-progress syncCycle() to finish (bounded by
  //    SHUTDOWN_GRACE_MS so a stuck cycle never blocks the deploy forever).
  // 3. Close the Fastify server (stops accepting new HTTP requests and drains
  //    keep-alive connections).
  // 4. Disconnect Prisma and exit.
  const shutdown = async (signal: string): Promise<void> => {
    console.log({ event: "shutdown-begin", signal, graceMs: SHUTDOWN_GRACE_MS });

    // Tell the sync loop to stop after the current batch.
    shutdownController.abort();

    // Drain the in-flight batch (if any) with a timeout.
    if (inflightSyncPromise) {
      const timeout = new Promise<void>((resolve) =>
        setTimeout(() => {
          console.warn({ event: "shutdown-grace-expired", graceMs: SHUTDOWN_GRACE_MS });
          resolve();
        }, SHUTDOWN_GRACE_MS)
      );
      await Promise.race([inflightSyncPromise, timeout]);
    }

    // Close HTTP server (Fastify drains open requests internally).
    await app.close();

    // Disconnect Prisma connection pool.
    await disconnectPrisma();

    console.log({ event: "shutdown-complete", signal });
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  // --- Start HTTP server ---
  try {
    await app.listen({ port: PORT, host: HOST });
    console.log({ event: "api-ready", port: PORT });
  } catch (err) {
    console.error({ event: "startup-error", error: err });
    process.exit(1);
  }

  // --- Start sync job in the background ---
  // Errors are caught inside the job loop; a truly fatal error
  // (e.g. unrecoverable schema mismatch) exits the process with code 1
  // so the orchestrator will restart.
  void runSyncJob(shutdownController.signal).catch((err) => {
    console.error({ event: "sync-job-fatal", error: err });
    process.exit(1);
  });
}

void main();
