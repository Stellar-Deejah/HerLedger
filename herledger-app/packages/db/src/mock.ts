import type { PrismaClient } from "@prisma/client";
import { vi } from "vitest";

import type {
  AttestationsRepository,
  AttestersRepository,
  BusinessesRepository,
  CheckpointRepository,
  DbClient,
  DisputesRepository,
  FinancialEventsRepository,
  IndexerErrorsRepository,
  StellarTransactionsRepository,
  UsersRepository,
} from "./types.js";

/**
 * Creates a mock DbClient with vitest mock functions for unit testing without
 * requiring a live database or module mocking hacks.
 */
export function createMockDbClient(overrides?: Partial<DbClient>): DbClient {
  const mockPrisma = {
    $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
  } as unknown as PrismaClient;

  const mockBusinesses: BusinessesRepository = {
    findAllActiveWallets: vi.fn().mockResolvedValue({ wallets: [], nextCursor: null }),
    findByWallet: vi.fn().mockResolvedValue(null),
    findById: vi.fn().mockResolvedValue(null),
    findByUserId: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({}),
    update: vi.fn().mockResolvedValue({}),
    deactivate: vi.fn().mockResolvedValue({}),
    ...overrides?.businesses,
  };

  const mockFinancialEvents: FinancialEventsRepository = {
    upsert: vi.fn().mockResolvedValue(undefined),
    updateStatus: vi.fn().mockResolvedValue(undefined),
    findByBusiness: vi.fn().mockResolvedValue([]),
    findRecentByBusiness: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findUpdatedAfter: vi.fn().mockResolvedValue([]),
    findAttestableEvents: vi.fn().mockResolvedValue([]),
    ...overrides?.financialEvents,
  };

  const mockAttestations: AttestationsRepository = {
    upsert: vi.fn().mockResolvedValue(undefined),
    upsertClaimDescription: vi.fn().mockResolvedValue({}),
    findByEvent: vi.fn().mockResolvedValue([]),
    findByBusiness: vi.fn().mockResolvedValue([]),
    findById: vi.fn().mockResolvedValue(null),
    findByAttestationIdAndBusiness: vi.fn().mockResolvedValue(null),
    ...overrides?.attestations,
  };

  const mockAttesters: AttestersRepository = {
    findByWallet: vi.fn().mockResolvedValue(null),
    upsert: vi.fn().mockResolvedValue({}),
    ...overrides?.attesters,
  };

  const mockCheckpoint: CheckpointRepository = {
    get: vi.fn().mockResolvedValue(0),
    save: vi.fn().mockResolvedValue(undefined),
    ...overrides?.checkpoint,
  };

  const mockIndexerErrors: IndexerErrorsRepository = {
    writeDeadLetter: vi.fn().mockResolvedValue({ errorId: "mock-err-id" }),
    findByErrorId: vi.fn().mockResolvedValue(null),
    markResolved: vi.fn().mockResolvedValue(undefined),
    incrementRetry: vi.fn().mockResolvedValue(undefined),
    ...overrides?.indexerErrors,
  };

  const mockStellarTransactions: StellarTransactionsRepository = {
    upsert: vi.fn().mockResolvedValue(undefined),
    findByHash: vi.fn().mockResolvedValue(null),
    ...overrides?.stellarTransactions,
  };

  const mockUsers: UsersRepository = {
    findById: vi.fn().mockResolvedValue(null),
    deleteAccount: vi.fn().mockResolvedValue(undefined),
    ...overrides?.users,
  };

  const mockDisputes: DisputesRepository = {
    findByEventId: vi.fn().mockResolvedValue(null),
    findAllByEventId: vi.fn().mockResolvedValue([]),
    create: vi.fn().mockResolvedValue({}),
    ...overrides?.disputes,
  };

  return {
    prisma: overrides?.prisma ?? mockPrisma,
    businesses: mockBusinesses,
    financialEvents: mockFinancialEvents,
    attestations: mockAttestations,
    attesters: mockAttesters,
    checkpoint: mockCheckpoint,
    indexerErrors: mockIndexerErrors,
    stellarTransactions: mockStellarTransactions,
    users: mockUsers,
    disputes: mockDisputes,
    ...overrides,
  };
}
