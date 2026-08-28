import { buildServer } from "./api/server.js";
import { runSyncJob } from "./jobs/sync-ledger.js";
import { scheduleReconciliation } from "./jobs/reconciliation.js";
import { disconnectPrisma } from "./db/client.js";
import { logger } from "./observability/index.js";

// ---------------------------------------------------------------------------
// Indexer entry point
// Starts the HTTP API server, the ledger sync job, and the reconciliation
// scheduler concurrently.
// ---------------------------------------------------------------------------

const PORT = Number(process.env["PORT"] ?? 4000);
const HOST = process.env["HOST"] ?? "0.0.0.0";

async function main(): Promise<void> {
  const app = buildServer();

  // Graceful shutdown
  const shutdown = async (signal: string): Promise<void> => {
    logger.info({ event: "shutdown", signal }, "Shutting down indexer");
    await app.close();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on("SIGTERM", () => void shutdown("SIGTERM"));
  process.on("SIGINT", () => void shutdown("SIGINT"));

  try {
    await app.listen({ port: PORT, host: HOST });
    logger.info({ event: "api-ready", port: PORT }, "Indexer API server listening");
  } catch (err) {
    logger.error({ event: "startup-error", error: err }, "Failed to start API server");
    process.exit(1);
  }

  // Start sync job in the background -- errors are caught inside the job loop
  void runSyncJob().catch((err) => {
    logger.error({ event: "sync-job-fatal", error: err }, "Fatal error in sync job");
    process.exit(1);
  });

  scheduleReconciliation();
}

void main();
