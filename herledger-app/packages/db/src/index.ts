// Client and factory
export {
  createDbClient,
  disconnectPrisma,
  getDbClient,
  getPrismaClient,
  resetDbClient,
  setDbClient,
} from "./client";

// Mock helper for unit tests
export { createMockDbClient } from "./mock";

// Repositories
export {
  findAllActiveBusinessWallets,
  findBusinessByWallet,
  findBusinessById,
  findBusinessByUserId,
  createBusinessProfile,
  updateBusinessProfile,
  deactivateBusinessProfile,
  createBusinessesRepository,
} from "./repositories/businesses";

export {
  upsertFinancialEvent,
  updateEventStatus,
  findEventsByBusiness,
  findRecentEventsByBusiness,
  findEventById,
  findEventsUpdatedAfter,
  findAttestableEvents,
  createFinancialEventsRepository,
} from "./repositories/financial-events";

export {
  upsertAttestation,
  upsertClaimDescription,
  findAttestationsByEvent,
  findAttestationsByBusiness,
  findAttestationById,
  findAttestationByAttestationIdAndBusiness,
  createAttestationsRepository,
} from "./repositories/attestations";

export {
  findAttesterByWallet,
  upsertAttester,
  createAttestersRepository,
} from "./repositories/attesters";

export {
  getCheckpoint,
  saveCheckpoint,
  MAIN_STREAM,
  EVENTS_STREAM,
  GLOBAL_WALLET,
  createCheckpointRepository,
} from "./repositories/checkpoint";

export {
  writeDeadLetter,
  findDeadLetterByErrorId,
  markDeadLetterResolved,
  incrementDeadLetterRetry,
  createIndexerErrorsRepository,
} from "./repositories/indexer-errors";

export {
  upsertStellarTransaction,
  createStellarTransactionsRepository,
} from "./repositories/stellar-transactions";

export { findUserById, deleteUserAccount, createUsersRepository } from "./repositories/users";

export {
  findDisputeByEventId,
  createDispute,
  createDisputesRepository,
} from "./repositories/disputes";

export {
  createAuditLog,
  findAuditLogsByEntity,
  type CreateAuditLogInput,
} from "./repositories/audit-log";

// Pagination and filtering utilities
export {
  clampPagination,
  paginateArray,
  buildCursorPagination,
  filterEventsByStatus,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./utils/pagination";

// Types and errors
export type {
  EventType,
  EventStatus,
  AttestationStatus,
  ActiveBusinessWalletsPage,
  CreateBusinessProfileInput,
  UpdateBusinessProfileInput,
  CreateFinancialEventInput,
  UpsertAttestationInput,
  UpsertClaimDescriptionInput,
  UpsertAttesterInput,
  DeadLetterInput,
  UpsertStellarTransactionInput,
  CreateDisputeInput,
  PaginationOptions,
  ActivityQueryOptions,
  FinancialEventsSummary,
  PaginatedResult,
  BusinessesRepository,
  FinancialEventsRepository,
  AttestationsRepository,
  AttestersRepository,
  CheckpointRepository,
  IndexerErrorsRepository,
  StellarTransactionsRepository,
  UsersRepository,
  DisputesRepository,
  DbClient,
} from "./types";

export { DatabaseError } from "./types";
