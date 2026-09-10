import type { PrismaClient } from "@prisma/client";

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
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getFn(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const globalVi = (globalThis as any).vi;
  if (globalVi && typeof globalVi.fn === "function") {
    return globalVi.fn.bind(globalVi);
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fallback = (impl?: any) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const calls: any[][] = [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fn: any = (...args: any[]) => {
      calls.push(args);
      return typeof fn._resolved !== "undefined"
        ? Promise.resolve(fn._resolved)
        : impl
          ? impl(...args)
          : undefined;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn.mockResolvedValue = (val: any) => {
      fn._resolved = val;
      return fn;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn.mockReturnValue = (val: any) => {
      fn._returned = val;
      return fn;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    fn.mockImplementation = (newImpl: any) => {
      impl = newImpl;
      return fn;
    };
    fn.mock = { calls };
    return fn;
  };
  return fallback;
}

/**
 * Creates a mock DbClient with vitest mock functions for unit testing without
 * requiring a live database or module mocking hacks.
 */
export function createMockDbClient(overrides?: Partial<DbClient>): DbClient {
  const fn = getFn();

  const mockPrisma = {
    $transaction: fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
  } as unknown as PrismaClient;

  const mockBusinesses: BusinessesRepository = {
    findAllActiveWallets: fn().mockResolvedValue({ wallets: [], nextCursor: null }),
    findByWallet: fn().mockResolvedValue(null),
    findById: fn().mockResolvedValue(null),
    findByUserId: fn().mockResolvedValue(null),
    create: fn().mockResolvedValue({}),
    update: fn().mockResolvedValue({}),
    deactivate: fn().mockResolvedValue({}),
    ...overrides?.businesses,
  };

  const mockFinancialEvents: FinancialEventsRepository = {
    upsert: fn().mockResolvedValue(undefined),
    updateStatus: fn().mockResolvedValue(undefined),
    findByBusiness: fn().mockResolvedValue([]),
    findRecentByBusiness: fn().mockResolvedValue([]),
    findById: fn().mockResolvedValue(null),
    findUpdatedAfter: fn().mockResolvedValue([]),
    findAttestableEvents: fn().mockResolvedValue([]),
    summarize: fn().mockResolvedValue({
      totalReceived: "0",
      totalSent: "0",
      netBalance: "0",
      countByStatus: { Pending: 0, Verified: 0, Disputed: 0, Revoked: 0 },
    }),
    ...overrides?.financialEvents,
  };

  const mockAttestations: AttestationsRepository = {
    upsert: fn().mockResolvedValue(undefined),
    upsertClaimDescription: fn().mockResolvedValue({}),
    findByEvent: fn().mockResolvedValue([]),
    findByBusiness: fn().mockResolvedValue([]),
    findById: fn().mockResolvedValue(null),
    findByAttestationIdAndBusiness: fn().mockResolvedValue(null),
    ...overrides?.attestations,
  };

  const mockAttesters: AttestersRepository = {
    findByWallet: fn().mockResolvedValue(null),
    upsert: fn().mockResolvedValue({}),
    ...overrides?.attesters,
  };

  const mockCheckpoint: CheckpointRepository = {
    get: fn().mockResolvedValue(0),
    save: fn().mockResolvedValue(undefined),
    ...overrides?.checkpoint,
  };

  const mockIndexerErrors: IndexerErrorsRepository = {
    writeDeadLetter: fn().mockResolvedValue({ errorId: "mock-err-id" }),
    findByErrorId: fn().mockResolvedValue(null),
    markResolved: fn().mockResolvedValue(undefined),
    incrementRetry: fn().mockResolvedValue(undefined),
    ...overrides?.indexerErrors,
  };

  const mockStellarTransactions: StellarTransactionsRepository = {
    upsert: fn().mockResolvedValue(undefined),
    ...overrides?.stellarTransactions,
  };

  const mockUsers: UsersRepository = {
    findById: fn().mockResolvedValue(null),
    deleteAccount: fn().mockResolvedValue(undefined),
    ...overrides?.users,
  };

  const mockDisputes: DisputesRepository = {
    findByEventId: fn().mockResolvedValue(null),
    create: fn().mockResolvedValue({}),
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
