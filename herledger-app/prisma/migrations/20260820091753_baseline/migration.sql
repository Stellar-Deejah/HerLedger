-- CreateEnum
CREATE TYPE "EventType" AS ENUM ('PaymentReceived', 'PaymentSent', 'InvoiceSettled', 'CommitmentFulfilled');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('Pending', 'Verified', 'Disputed', 'Revoked');

-- CreateEnum
CREATE TYPE "AttestationStatus" AS ENUM ('Active', 'Revoked');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('Submitted', 'Investigating', 'Resolved', 'Revoked');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "name" TEXT,
    "image" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    "deletedAt" TIMESTAMPTZ,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMPTZ,
    "refreshTokenExpiresAt" TIMESTAMPTZ,
    "scope" TEXT,
    "idToken" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "business_profiles" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "metadataHash" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "business_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_events" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventType" "EventType" NOT NULL,
    "assetAddress" TEXT NOT NULL,
    "amount" TEXT NOT NULL,
    "stellarReference" TEXT NOT NULL,
    "metadataHash" TEXT NOT NULL,
    "status" "EventStatus" NOT NULL DEFAULT 'Pending',
    "ledgerSequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "financial_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attestations" (
    "id" TEXT NOT NULL,
    "attestationId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "attesterAddress" TEXT NOT NULL,
    "claimHash" TEXT NOT NULL,
    "claimDescription" TEXT,
    "status" "AttestationStatus" NOT NULL DEFAULT 'Active',
    "ledgerSequence" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "attestations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attester_profiles" (
    "id" TEXT NOT NULL,
    "walletAddress" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "attester_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reasonPlaintext" TEXT NOT NULL,
    "reasonHash" TEXT NOT NULL,
    "status" "DisputeStatus" NOT NULL DEFAULT 'Submitted',
    "submittedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMPTZ,
    "resolutionTxHash" TEXT,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stellar_transactions" (
    "hash" TEXT NOT NULL,
    "ledgerSequence" INTEGER NOT NULL,
    "successful" BOOLEAN NOT NULL,
    "sourceAddress" TEXT NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stellar_transactions_pkey" PRIMARY KEY ("hash")
);

-- CreateTable
CREATE TABLE "indexer_checkpoints" (
    "id" TEXT NOT NULL,
    "stream" TEXT NOT NULL,
    "lastLedger" INTEGER NOT NULL,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "indexer_checkpoints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "indexer_errors" (
    "id" TEXT NOT NULL,
    "errorId" TEXT NOT NULL,
    "rawXdr" TEXT NOT NULL,
    "context" JSONB,
    "stage" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "resolvedAt" TIMESTAMPTZ,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "indexer_errors_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_userId_idx" ON "sessions"("userId");

-- CreateIndex
CREATE INDEX "accounts_userId_idx" ON "accounts"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "accounts_providerId_accountId_key" ON "accounts"("providerId", "accountId");

-- CreateIndex
CREATE UNIQUE INDEX "verifications_identifier_value_key" ON "verifications"("identifier", "value");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_userId_key" ON "business_profiles"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_businessId_key" ON "business_profiles"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "business_profiles_walletAddress_key" ON "business_profiles"("walletAddress");

-- CreateIndex
CREATE INDEX "business_profiles_walletAddress_idx" ON "business_profiles"("walletAddress");

-- CreateIndex
CREATE INDEX "business_profiles_businessId_idx" ON "business_profiles"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "financial_events_eventId_key" ON "financial_events"("eventId");

-- CreateIndex
CREATE INDEX "financial_events_businessId_idx" ON "financial_events"("businessId");

-- CreateIndex
CREATE INDEX "financial_events_ledgerSequence_idx" ON "financial_events"("ledgerSequence");

-- CreateIndex
CREATE INDEX "financial_events_status_idx" ON "financial_events"("status");

-- CreateIndex
CREATE UNIQUE INDEX "attestations_attestationId_key" ON "attestations"("attestationId");

-- CreateIndex
CREATE INDEX "attestations_eventId_idx" ON "attestations"("eventId");

-- CreateIndex
CREATE INDEX "attestations_attesterAddress_idx" ON "attestations"("attesterAddress");

-- CreateIndex
CREATE UNIQUE INDEX "attester_profiles_walletAddress_key" ON "attester_profiles"("walletAddress");

-- CreateIndex
CREATE INDEX "attester_profiles_walletAddress_idx" ON "attester_profiles"("walletAddress");

-- CreateIndex
CREATE INDEX "disputes_eventId_idx" ON "disputes"("eventId");

-- CreateIndex
CREATE INDEX "disputes_userId_idx" ON "disputes"("userId");

-- CreateIndex
CREATE INDEX "disputes_status_idx" ON "disputes"("status");

-- CreateIndex
CREATE INDEX "stellar_transactions_ledgerSequence_idx" ON "stellar_transactions"("ledgerSequence");

-- CreateIndex
CREATE INDEX "stellar_transactions_sourceAddress_idx" ON "stellar_transactions"("sourceAddress");

-- CreateIndex
CREATE UNIQUE INDEX "indexer_checkpoints_stream_key" ON "indexer_checkpoints"("stream");

-- CreateIndex
CREATE UNIQUE INDEX "indexer_errors_errorId_key" ON "indexer_errors"("errorId");

-- CreateIndex
CREATE INDEX "indexer_errors_stage_idx" ON "indexer_errors"("stage");

-- CreateIndex
CREATE INDEX "indexer_errors_resolvedAt_idx" ON "indexer_errors"("resolvedAt");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "business_profiles" ADD CONSTRAINT "business_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "financial_events" ADD CONSTRAINT "financial_events_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "business_profiles"("businessId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attestations" ADD CONSTRAINT "attestations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "financial_events"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "financial_events"("eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
