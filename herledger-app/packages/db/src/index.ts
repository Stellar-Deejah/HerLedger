// Client and factory
export {
  createDbClient,
  disconnectPrisma,
  getDbClient,
  getPrismaClient,
  resetDbClient,
  setDbClient,
} from "./client.js";

// Mock helper for unit tests
export { createMockDbClient } from "./mock.js";

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
} from "./repositories/businesses.js";

export {
  upsertFinancialEvent,
  updateEventStatus,
  findEventsByBusiness,
  findRecentEventsByBusiness,
  findEventById,
  findEventsUpdatedAfter,
  findAttestableEvents,
  createFinancialEventsRepository,
} from "./repositories/financial-events.js";

export {
  upsertAttestation,
  upsertClaimDescription,
  findAttestationsByEvent,
  findAttestationsByBusiness,
  findAttestationById,
  findAttestationByAttestationIdAndBusiness,
  createAttestationsRepository,
} from "./repositories/attestations.js";

export {
  findAttesterByWallet,
  upsertAttester,
  createAttestersRepository,
} from "./repositories/attesters.js";

export {
  getCheckpoint,
  saveCheckpoint,
  MAIN_STREAM,
  EVENTS_STREAM,
  createCheckpointRepository,
} from "./repositories/checkpoint.js";

export {
  writeDeadLetter,
  findDeadLetterByErrorId,
  markDeadLetterResolved,
  incrementDeadLetterRetry,
  createIndexerErrorsRepository,
} from "./repositories/indexer-errors.js";

export {
  upsertStellarTransaction,
  findStellarTransactionByHash,
  createStellarTransactionsRepository,
} from "./repositories/stellar-transactions.js";

export {
  findUserById,
  deleteUserAccount,
  createUsersRepository,
} from "./repositories/users.js";

export {
  findDisputeByEventId,
  findAllDisputesByEventId,
  createDispute,
  createDisputesRepository,
} from "./repositories/disputes.js";

// Pagination and filtering utilities
export {
  clampPagination,
  paginateArray,
  buildCursorPagination,
  filterEventsByStatus,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
} from "./utils/pagination.js";

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
} from "./types.js";

export { DatabaseError } from "./types.js";
