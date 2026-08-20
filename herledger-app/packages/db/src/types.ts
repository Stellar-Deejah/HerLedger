import type {
  Attestation,
  AttesterProfile,
  BusinessProfile,
  Dispute,
  FinancialEvent,
  IndexerError,
  PrismaClient,
  User,
} from "@prisma/client";

// ---------------------------------------------------------------------------
// Domain Enums & Value Types
// ---------------------------------------------------------------------------

export type EventType =
  | "PaymentReceived"
  | "PaymentSent"
  | "InvoiceSettled"
  | "CommitmentFulfilled";

export type EventStatus = "Pending" | "Verified" | "Disputed" | "Revoked";

export type AttestationStatus = "Active" | "Revoked";

// ---------------------------------------------------------------------------
// Error Types
// ---------------------------------------------------------------------------

export class DatabaseError extends Error {
  readonly kind = "DatabaseError" as const;
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = "DatabaseError";
  }
}

// ---------------------------------------------------------------------------
// Input / Output Interfaces
// ---------------------------------------------------------------------------

export interface ActiveBusinessWalletsPage {
  wallets: { id: string; businessId: string; walletAddress: string }[];
  nextCursor: string | null;
}

export interface CreateBusinessProfileInput {
  userId: string;
  businessId: string;
  walletAddress: string;
  displayName: string;
  metadataHash: string;
  active?: boolean;
}

export interface UpdateBusinessProfileInput {
  displayName?: string;
  metadataHash?: string;
  walletAddress?: string;
  active?: boolean;
}

export interface CreateFinancialEventInput {
  businessId: string;
  eventId: string;
  eventType: EventType;
  assetAddress: string;
  amount: bigint;
  stellarReference: string;
  metadataHash: string;
  status: EventStatus;
  ledgerSequence: number;
}

export interface UpsertAttestationInput {
  attestationId: string;
  eventId: string;
  attesterAddress: string;
  claimHash: string;
  status: AttestationStatus;
  ledgerSequence: number;
  claimDescription?: string | null;
}

export interface UpsertClaimDescriptionInput {
  attestationId: string;
  eventId: string;
  attesterAddress: string;
  claimHash: string;
  claimDescription: string;
  ledgerSequence: number;
}

export interface UpsertAttesterInput {
  walletAddress: string;
  displayName: string;
  description?: string | null;
  active?: boolean;
}

export interface DeadLetterInput {
  rawXdr: string;
  stage: string;
  message: string;
  context?: Record<string, unknown>;
}

export interface UpsertStellarTransactionInput {
  hash: string;
  ledgerSequence: number;
  successful: boolean;
  sourceAddress: string;
}

import type { DisputeStatus } from "@prisma/client";

export type { DisputeStatus };

export interface CreateDisputeInput {
  eventId: string;
  userId: string;
  reasonPlaintext: string;
  reasonHash: string;
  status?: DisputeStatus;
}

export interface PaginationOptions {
  offset?: number;
  limit?: number;
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    offset: number;
    limit: number;
    count: number;
    total?: number;
  };
}

// ---------------------------------------------------------------------------
// Database Client (Dependency Injection Interface)
// ---------------------------------------------------------------------------

export interface BusinessesRepository {
  findAllActiveWallets(options?: {
    cursor?: string;
    pageSize?: number;
  }): Promise<ActiveBusinessWalletsPage>;
  findByWallet(walletAddress: string): Promise<BusinessProfile | null>;
  findById(businessId: string): Promise<BusinessProfile | null>;
  findByUserId(userId: string): Promise<BusinessProfile | null>;
  create(data: CreateBusinessProfileInput): Promise<BusinessProfile>;
  update(id: string, data: UpdateBusinessProfileInput): Promise<BusinessProfile>;
  deactivate(id: string): Promise<BusinessProfile>;
}

export interface FinancialEventsRepository {
  upsert(input: CreateFinancialEventInput): Promise<void>;
  updateStatus(eventId: string, status: EventStatus): Promise<void>;
  findByBusiness(
    businessId: string,
    offset?: number,
    limit?: number
  ): Promise<FinancialEvent[]>;
  findRecentByBusiness(
    businessId: string,
    pagination?: PaginationOptions
  ): Promise<FinancialEvent[]>;
  findById(eventId: string): Promise<FinancialEvent | null>;
  findUpdatedAfter(businessId: string, after: Date): Promise<FinancialEvent[]>;
  findAttestableEvents(pagination?: PaginationOptions): Promise<FinancialEvent[]>;
}

export interface AttestationsRepository {
  upsert(input: UpsertAttestationInput): Promise<void>;
  upsertClaimDescription(input: UpsertClaimDescriptionInput): Promise<Attestation>;
  findByEvent(eventId: string): Promise<Attestation[]>;
  findByBusiness(
    businessId: string,
    options?: { includeRevoked?: boolean }
  ): Promise<Attestation[]>;
  findById(attestationId: string): Promise<Attestation | null>;
  findByAttestationIdAndBusiness(
    attestationId: string,
    businessId: string
  ): Promise<Attestation | null>;
}

export interface AttestersRepository {
  findByWallet(walletAddress: string): Promise<AttesterProfile | null>;
  upsert(input: UpsertAttesterInput): Promise<AttesterProfile>;
}

export interface CheckpointRepository {
  get(stream: string): Promise<number>;
  save(stream: string, lastLedger: number): Promise<void>;
}

export interface IndexerErrorsRepository {
  writeDeadLetter(input: DeadLetterInput): Promise<{ errorId: string }>;
  findByErrorId(errorId: string): Promise<IndexerError | null>;
  markResolved(errorId: string): Promise<void>;
  incrementRetry(errorId: string, message: string): Promise<void>;
}

export interface StellarTransactionsRepository {
  upsert(input: UpsertStellarTransactionInput): Promise<void>;
}

export interface UsersRepository {
  findById(id: string): Promise<User | null>;
  deleteAccount(userId: string): Promise<void>;
}

export interface DisputesRepository {
  findByEventId(eventId: string): Promise<Dispute | null>;
  create(data: CreateDisputeInput): Promise<Dispute>;
}

export interface DbClient {
  readonly prisma: PrismaClient;
  readonly businesses: BusinessesRepository;
  readonly financialEvents: FinancialEventsRepository;
  readonly attestations: AttestationsRepository;
  readonly attesters: AttestersRepository;
  readonly checkpoint: CheckpointRepository;
  readonly indexerErrors: IndexerErrorsRepository;
  readonly stellarTransactions: StellarTransactionsRepository;
  readonly users: UsersRepository;
  readonly disputes: DisputesRepository;
}
