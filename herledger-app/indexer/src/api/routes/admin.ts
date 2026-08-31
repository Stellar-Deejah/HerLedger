import type { FastifyInstance } from "fastify";
import { TransactionBuilder } from "@stellar/stellar-sdk";
import { z } from "zod";
import { getPrismaClient } from "../../db/client.js";
import {
  findDeadLetterByErrorId,
  markDeadLetterResolved,
  incrementDeadLetterRetry,
} from "../../db/schema/indexer-errors.js";
import { processTransactionForWallet } from "../../jobs/process-transaction.js";
import {
  getStellarNetworkConfig,
  getContractConfig as getRawContractConfig,
} from "@herledger/config/server";
import { registerCurrentNetworkAddresses, buildContractConfig } from "@herledger/sdk";

// ---------------------------------------------------------------------------
// Admin: dead-letter replay
//
// Retries a previously failed event by re-running the parsing + indexing
// pipeline against its stored raw XDR. Successful replay deletes -- er,
// marks resolved -- the dead-letter row; failure increments its retry
// counter so operators can see how many times an event has failed.
// ---------------------------------------------------------------------------

const MAX_RETRIES = 5;

const errorIdSchema = z.object({
  errorId: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Invalid error ID format"),
});

function isAuthorized(req: { headers: Record<string, unknown> }): boolean {
  const expected = process.env["ADMIN_API_TOKEN"];
  if (!expected) return false; // fail closed if not configured
  const provided = req.headers["x-admin-token"];
  return provided === expected;
}

export async function adminRoutes(app: FastifyInstance): Promise<void> {
  app.post<{ Params: { errorId: string } }>("/replay/:errorId", async (req, reply) => {
    if (!isAuthorized(req)) {
      return reply.status(401).send({
        data: null,
        error: { code: "UNAUTHORIZED", message: "Missing or invalid admin token" },
      });
    }

    const params = errorIdSchema.safeParse(req.params);
    if (!params.success) {
      return reply.status(400).send({
        data: null,
        error: { code: "INVALID_PARAMS", message: "Invalid error ID" },
      });
    }

    const prisma = getPrismaClient();
    const { errorId } = params.data;

    const row = await findDeadLetterByErrorId(prisma, errorId);
    if (!row) {
      return reply.status(404).send({
        data: null,
        error: { code: "NOT_FOUND", message: `No dead-letter row for errorId ${errorId}` },
      });
    }

    if (row.resolvedAt) {
      return reply.status(409).send({
        data: null,
        error: {
          code: "ALREADY_RESOLVED",
          message: "This event has already been replayed successfully",
        },
      });
    }

    if (row.retryCount >= MAX_RETRIES) {
      return reply.status(409).send({
        data: null,
        error: {
          code: "MAX_RETRIES_EXCEEDED",
          message: `This event has already failed ${row.retryCount} times (max ${MAX_RETRIES})`,
        },
      });
    }

    const context = (row.context ?? {}) as { walletAddress?: string; ledgerSequence?: number };
    if (!context.walletAddress) {
      return reply.status(422).send({
        data: null,
        error: {
          code: "MISSING_CONTEXT",
          message: "Dead-letter row is missing walletAddress context",
        },
      });
    }

    try {
      const stellarConfig = getStellarNetworkConfig();
      const rawContractConfig = getRawContractConfig();
      const registry = registerCurrentNetworkAddresses(stellarConfig.network, rawContractConfig);
      const contractConfig = buildContractConfig(
        registry,
        stellarConfig.network,
        rawContractConfig
      );

      const parsed = TransactionBuilder.fromXDR(row.rawXdr, stellarConfig.networkPassphrase);
      const tx = "innerTransaction" in parsed ? parsed.innerTransaction : parsed;

      const outcome = await processTransactionForWallet(
        {
          hash: tx.hash().toString("hex"),
          successful: true,
          source_account: tx.source,
          ledger_attr: context.ledgerSequence ?? 0,
        },
        context.walletAddress,
        prisma,
        stellarConfig,
        contractConfig
      );

      await markDeadLetterResolved(prisma, errorId);

      return reply.send({
        data: { errorId, outcome, retryCount: row.retryCount },
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await incrementDeadLetterRetry(prisma, errorId, message);

      return reply.status(500).send({
        data: null,
        error: {
          code: "REPLAY_FAILED",
          message,
        },
      });
    }
  });
}
