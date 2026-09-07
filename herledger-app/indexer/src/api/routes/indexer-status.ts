import type { FastifyInstance } from "fastify";
import { getPrismaClient } from "../../db/client.js";
import { getCheckpoint, MAIN_STREAM } from "../../db/schema/checkpoint.js";
import { getCycleMetrics } from "../../jobs/sync-metrics.js";
import { fetchLatestLedger } from "../../stellar/rpc.js";
import { getStellarNetworkConfig } from "@herledger/config/server";

export async function indexerStatusRoutes(app: FastifyInstance): Promise<void> {
  app.get("/status", async (_req, reply) => {
    const prisma = getPrismaClient();
    const lastSuccessfulLedger = await getCheckpoint(prisma, MAIN_STREAM);
    const stellarConfig = getStellarNetworkConfig();
    const chainTipLedger = await fetchLatestLedger(stellarConfig);
    const lagSeconds = calculateLagSeconds(chainTipLedger - lastSuccessfulLedger);

    // Count pending errors (unresolved dead letters)
    const pendingErrors = await prisma.indexerError.count({
      where: { resolvedAt: null },
    });

    return reply.send({
      data: {
        stream: MAIN_STREAM,
        lastSuccessfulLedger,
        chainTipLedger,
        lagSeconds,
        pendingErrors,
        lastCycle: getCycleMetrics(),
      },
      error: null,
    });
  });
}

/**
 * Estimate lag in seconds based on ledger count difference.
 * Stellar average is ~5 seconds per ledger.
 */
function calculateLagSeconds(ledgerDiff: number): number {
  const SECONDS_PER_LEDGER = 5;
  return Math.max(0, ledgerDiff * SECONDS_PER_LEDGER);
}
