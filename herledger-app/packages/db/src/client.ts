import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

import { createAttestationsRepository } from "./repositories/attestations.js";
import { createAttestersRepository } from "./repositories/attesters.js";
import { createBusinessesRepository } from "./repositories/businesses.js";
import { createCheckpointRepository } from "./repositories/checkpoint.js";
import { createDisputesRepository } from "./repositories/disputes.js";
import { createFinancialEventsRepository } from "./repositories/financial-events.js";
import { createIndexerErrorsRepository } from "./repositories/indexer-errors.js";
import { createStellarTransactionsRepository } from "./repositories/stellar-transactions.js";
import { createUsersRepository } from "./repositories/users.js";
import type { DbClient } from "./types.js";

const DEFAULT_STATEMENT_TIMEOUT_MS = 10_000;

function buildDatabaseUrl(): string {
  const raw = process.env["DATABASE_URL"];
  if (!raw) {
    throw new Error("DATABASE_URL is not set");
  }
  try {
    const url = new URL(raw);
    if (!url.searchParams.has("statement_timeout")) {
      const timeoutMs = process.env["DB_STATEMENT_TIMEOUT_MS"]
        ? Number(process.env["DB_STATEMENT_TIMEOUT_MS"])
        : DEFAULT_STATEMENT_TIMEOUT_MS;
      url.searchParams.set("statement_timeout", String(timeoutMs));
    }
    return url.toString();
  } catch {
    return raw;
  }
}

function createPrismaClient(): PrismaClient {
  const isDev = process.env["NODE_ENV"] === "development";
  const databaseUrl = buildDatabaseUrl();

  const client = new PrismaClient({
    adapter: new PrismaPg(databaseUrl),
    log: [
      ...(isDev ? [{ emit: "event", level: "query" } as const] : []),
      { emit: "event", level: "warn" } as const,
      { emit: "event", level: "error" } as const,
    ],
  });

  client.$on("warn" as never, (e: { message: string }) => {
    console.warn({ event: "prisma-warn", message: e?.message });
  });

  client.$on("error" as never, (e: { message: string }) => {
    console.error({ event: "prisma-error", message: e?.message });
  });

  return client;
}

let _prisma: PrismaClient | null = null;

export function getPrismaClient(): PrismaClient {
  if (!_prisma) {
    _prisma = createPrismaClient();
  }
  return _prisma;
}

/**
 * Creates a repository-backed DbClient instance wrapping a PrismaClient.
 * Enables dependency injection for testing and alternative runtime configs.
 */
export function createDbClient(prisma: PrismaClient = getPrismaClient()): DbClient {
  return {
    prisma,
    businesses: createBusinessesRepository(prisma),
    financialEvents: createFinancialEventsRepository(prisma),
    attestations: createAttestationsRepository(prisma),
    attesters: createAttestersRepository(prisma),
    checkpoint: createCheckpointRepository(prisma),
    indexerErrors: createIndexerErrorsRepository(prisma),
    stellarTransactions: createStellarTransactionsRepository(prisma),
    users: createUsersRepository(prisma),
    disputes: createDisputesRepository(prisma),
  };
}

let _dbClient: DbClient | null = null;

/**
 * Global DbClient singleton for production runtime.
 */
export function getDbClient(): DbClient {
  if (!_dbClient) {
    _dbClient = createDbClient(getPrismaClient());
  }
  return _dbClient;
}

/**
 * Sets a custom DbClient (e.g. for testing dependency injection).
 */
export function setDbClient(client: DbClient | null): void {
  _dbClient = client;
}

/**
 * Resets the global DbClient singleton.
 */
export function resetDbClient(): void {
  _dbClient = null;
}

/**
 * Disconnects the Prisma client on shutdown.
 */
export async function disconnectPrisma(): Promise<void> {
  if (_prisma) {
    await _prisma.$disconnect();
    _prisma = null;
    _dbClient = null;
  }
}
