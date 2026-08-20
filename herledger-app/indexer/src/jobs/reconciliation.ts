import cron from "node-cron";
import { getPrismaClient } from "../db/client.js";
import {
  getStellarNetworkConfig,
  getContractConfig as getRawContractConfig,
} from "@herledger/config/server";
import {
  registerCurrentNetworkAddresses,
  buildContractConfig,
  getFinancialEvent,
} from "@herledger/sdk";
import { logger, generateCorrelationId, runWithContext } from "../observability/index.js";

// ---------------------------------------------------------------------------
// Nightly reconciliation job.
//
// Samples a random subset of indexed FinancialEvent rows and cross-checks
// each against the live on-chain contract state via the SDK. Divergence
// (e.g. from a bug in indexPayment) is logged as a discrepancy rather than
// silently accumulating. Runs on a configurable cron schedule.
// ---------------------------------------------------------------------------

const DEFAULT_SAMPLE_SIZE = 50;
const DEFAULT_CRON_SCHEDULE = "0 2 * * *"; // nightly at 02:00

interface IndexedEventRow {
  id: string;
  eventId: string;
  eventType: string;
  status: string;
  amount: string;
}

async function sampleIndexedEvents(
  prisma: ReturnType<typeof getPrismaClient>,
  sampleSize: number
): Promise<IndexedEventRow[]> {
  // Random sampling via SQL rather than pulling every row into memory --
  // this table can grow large, and reconciliation only needs a
  // representative subset per cycle, not an exhaustive scan.
  return prisma.$queryRaw<IndexedEventRow[]>`
    SELECT id, "eventId", "eventType", status, amount
    FROM financial_events
    ORDER BY RANDOM()
    LIMIT ${sampleSize}
  `;
}

export interface ReconciliationDiscrepancy {
  eventId: string;
  field: string;
  indexed: string;
  onChain: string;
}

export async function runReconciliationCycle(
  sampleSize: number = DEFAULT_SAMPLE_SIZE
): Promise<{ sampled: number; discrepancies: ReconciliationDiscrepancy[] }> {
  const correlationId = generateCorrelationId();

  return runWithContext({ correlationId, job: "reconciliation" }, async () => {
    const prisma = getPrismaClient();
    const stellarConfig = getStellarNetworkConfig();
    const rawContractConfig = getRawContractConfig();
    const registry = registerCurrentNetworkAddresses(stellarConfig.network, rawContractConfig);
    const contractConfig = buildContractConfig(registry, stellarConfig.network, rawContractConfig);

    const rows = await sampleIndexedEvents(prisma, sampleSize);
    const discrepancies: ReconciliationDiscrepancy[] = [];

    for (const row of rows) {
      let onChain;
      try {
        onChain = await getFinancialEvent(row.eventId, stellarConfig, contractConfig);
      } catch (err) {
        logger.error(
          {
            job: "reconciliation",
            event: "on-chain-fetch-failed",
            eventId: row.eventId,
            error: err instanceof Error ? err.message : String(err),
          },
          "Failed to fetch on-chain financial event during reconciliation"
        );
        continue;
      }

      if (!onChain) {
        discrepancies.push({
          eventId: row.eventId,
          field: "existence",
          indexed: "present",
          onChain: "missing",
        });
        continue;
      }

      if (onChain.status !== row.status) {
        discrepancies.push({
          eventId: row.eventId,
          field: "status",
          indexed: row.status,
          onChain: onChain.status,
        });
      }

      if (onChain.eventType !== row.eventType) {
        discrepancies.push({
          eventId: row.eventId,
          field: "eventType",
          indexed: row.eventType,
          onChain: onChain.eventType,
        });
      }

      if (onChain.amount.toString() !== row.amount) {
        discrepancies.push({
          eventId: row.eventId,
          field: "amount",
          indexed: row.amount,
          onChain: onChain.amount.toString(),
        });
      }
    }

    if (discrepancies.length > 0) {
      logger.error(
        {
          job: "reconciliation",
          event: "discrepancies-found",
          sampled: rows.length,
          discrepancyCount: discrepancies.length,
          discrepancies,
        },
        "Reconciliation found discrepancies between indexed and on-chain state"
      );
    } else {
      logger.info(
        {
          job: "reconciliation",
          event: "cycle-complete",
          sampled: rows.length,
          discrepancyCount: 0,
        },
        "Reconciliation cycle completed successfully with 0 discrepancies"
      );
    }

    return { sampled: rows.length, discrepancies };
  });
}

/**
 * Schedules the reconciliation job via RECONCILIATION_CRON_SCHEDULE (default
 * nightly at 02:00) and RECONCILIATION_SAMPLE_SIZE (default 50). Call once
 * at indexer startup.
 */
export function scheduleReconciliation(): void {
  const schedule = process.env["RECONCILIATION_CRON_SCHEDULE"] ?? DEFAULT_CRON_SCHEDULE;
  const sampleSize = process.env["RECONCILIATION_SAMPLE_SIZE"]
    ? Number(process.env["RECONCILIATION_SAMPLE_SIZE"])
    : DEFAULT_SAMPLE_SIZE;

  if (!cron.validate(schedule)) {
    throw new Error(`Invalid RECONCILIATION_CRON_SCHEDULE: "${schedule}"`);
  }

  cron.schedule(schedule, () => {
    runReconciliationCycle(sampleSize).catch((err) => {
      logger.error(
        {
          job: "reconciliation",
          event: "cycle-failed",
          error: err instanceof Error ? err.message : String(err),
        },
        "Reconciliation cycle failed"
      );
    });
  });

  logger.info(
    {
      job: "reconciliation",
      event: "scheduled",
      schedule,
      sampleSize,
    },
    "Reconciliation job scheduled"
  );
}
