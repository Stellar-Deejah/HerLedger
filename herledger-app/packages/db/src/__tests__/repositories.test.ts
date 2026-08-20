import type { PrismaClient } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";

import {
  findAttestationById,
  findAttestationsByBusiness,
  findAttestationsByEvent,
  upsertAttestation,
  upsertClaimDescription,
} from "../repositories/attestations.js";
import { findAttesterByWallet, upsertAttester } from "../repositories/attesters.js";
import {
  createBusinessProfile,
  deactivateBusinessProfile,
  findAllActiveBusinessWallets,
  findBusinessById,
  findBusinessByUserId,
  findBusinessByWallet,
  updateBusinessProfile,
} from "../repositories/businesses.js";
import { getCheckpoint, saveCheckpoint } from "../repositories/checkpoint.js";
import { createDispute, findDisputeByEventId } from "../repositories/disputes.js";
import {
  findAttestableEvents,
  findEventById,
  findEventsByBusiness,
  findEventsUpdatedAfter,
  findRecentEventsByBusiness,
  updateEventStatus,
  upsertFinancialEvent,
} from "../repositories/financial-events.js";
import {
  findDeadLetterByErrorId,
  incrementDeadLetterRetry,
  markDeadLetterResolved,
  writeDeadLetter,
} from "../repositories/indexer-errors.js";
import { upsertStellarTransaction } from "../repositories/stellar-transactions.js";
import { deleteUserAccount, findUserById } from "../repositories/users.js";
import { DatabaseError } from "../types.js";

describe("Database Repositories", () => {
  describe("businesses repository", () => {
    it("finds business by wallet, id, and userId", async () => {
      const mockPrisma = {
        businessProfile: {
          findUnique: vi.fn().mockResolvedValue({ id: "1", businessId: "biz-1", walletAddress: "G1" }),
          findFirst: vi.fn().mockResolvedValue({ id: "1", userId: "u1" }),
          findMany: vi.fn().mockResolvedValue([{ id: "1", businessId: "biz-1", walletAddress: "G1" }]),
          create: vi.fn().mockResolvedValue({ id: "1", businessId: "biz-1" }),
          update: vi.fn().mockResolvedValue({ id: "1", active: false }),
        },
      } as unknown as PrismaClient;

      const byWallet = await findBusinessByWallet(mockPrisma, "G1");
      expect(byWallet?.businessId).toBe("biz-1");

      const byId = await findBusinessById(mockPrisma, "biz-1");
      expect(byId?.businessId).toBe("biz-1");

      const byUserId = await findBusinessByUserId(mockPrisma, "u1");
      expect(byUserId?.id).toBe("1");

      const page = await findAllActiveBusinessWallets(mockPrisma, { pageSize: 10 });
      expect(page.wallets).toHaveLength(1);
      expect(page.nextCursor).toBeNull();

      const created = await createBusinessProfile(mockPrisma, {
        userId: "u1",
        businessId: "biz-1",
        walletAddress: "G1",
        displayName: "Biz One",
        metadataHash: "hash1",
      });
      expect(created.businessId).toBe("biz-1");

      const updated = await updateBusinessProfile(mockPrisma, "1", { displayName: "New Name" });
      expect(updated).toBeDefined();

      const deactivated = await deactivateBusinessProfile(mockPrisma, "1");
      expect(deactivated.active).toBe(false);
    });

    it("wraps failures in DatabaseError", async () => {
      const mockPrisma = {
        businessProfile: {
          findUnique: vi.fn().mockRejectedValue(new Error("connection failed")),
        },
      } as unknown as PrismaClient;

      await expect(findBusinessByWallet(mockPrisma, "G1")).rejects.toThrow(DatabaseError);
    });
  });

  describe("financial events repository", () => {
    it("performs upserts, status updates, and queries", async () => {
      const mockPrisma = {
        financialEvent: {
          upsert: vi.fn().mockResolvedValue({}),
          update: vi.fn().mockResolvedValue({}),
          findMany: vi.fn().mockResolvedValue([{ eventId: "ev-1" }]),
          findUnique: vi.fn().mockResolvedValue({ eventId: "ev-1" }),
        },
      } as unknown as PrismaClient;

      await upsertFinancialEvent(mockPrisma, {
        businessId: "biz-1",
        eventId: "ev-1",
        eventType: "PaymentReceived",
        assetAddress: "CASSET",
        amount: 1000n,
        stellarReference: "ref1",
        metadataHash: "hash1",
        status: "Verified",
        ledgerSequence: 100,
      });
      expect(mockPrisma.financialEvent.upsert).toHaveBeenCalled();

      await updateEventStatus(mockPrisma, "ev-1", "Disputed");
      expect(mockPrisma.financialEvent.update).toHaveBeenCalled();

      const events = await findEventsByBusiness(mockPrisma, "biz-1", 0, 10);
      expect(events).toHaveLength(1);

      const recent = await findRecentEventsByBusiness(mockPrisma, "biz-1", { offset: 0, limit: 10 });
      expect(recent).toHaveLength(1);

      const event = await findEventById(mockPrisma, "ev-1");
      expect(event?.eventId).toBe("ev-1");

      const updated = await findEventsUpdatedAfter(mockPrisma, "biz-1", new Date());
      expect(updated).toHaveLength(1);

      const attestable = await findAttestableEvents(mockPrisma, { offset: 0, limit: 10 });
      expect(attestable).toHaveLength(1);
    });
  });

  describe("attestations repository", () => {
    it("handles upsert, claim description, and queries", async () => {
      const mockPrisma = {
        attestation: {
          upsert: vi.fn().mockResolvedValue({ attestationId: "att-1" }),
          findMany: vi.fn().mockResolvedValue([{ attestationId: "att-1", ledgerSequence: 10 }]),
          findUnique: vi.fn().mockResolvedValue({ attestationId: "att-1" }),
          findFirst: vi.fn().mockResolvedValue({ attestationId: "att-1" }),
        },
        financialEvent: {
          findMany: vi.fn().mockResolvedValue([
            { eventId: "ev-1", attestations: [{ attestationId: "att-1", ledgerSequence: 10 }] },
          ]),
        },
      } as unknown as PrismaClient;

      await upsertAttestation(mockPrisma, {
        attestationId: "att-1",
        eventId: "ev-1",
        attesterAddress: "GATTESTER",
        claimHash: "hash",
        status: "Active",
        ledgerSequence: 10,
      });
      expect(mockPrisma.attestation.upsert).toHaveBeenCalled();

      const desc = await upsertClaimDescription(mockPrisma, {
        attestationId: "att-1",
        eventId: "ev-1",
        attesterAddress: "GATTESTER",
        claimHash: "hash",
        claimDescription: "Verified transaction",
        ledgerSequence: 10,
      });
      expect(desc.attestationId).toBe("att-1");

      const byEvent = await findAttestationsByEvent(mockPrisma, "ev-1");
      expect(byEvent).toHaveLength(1);

      const byBiz = await findAttestationsByBusiness(mockPrisma, "biz-1");
      expect(byBiz).toHaveLength(1);

      const byId = await findAttestationById(mockPrisma, "att-1");
      expect(byId?.attestationId).toBe("att-1");
    });
  });

  describe("attesters, checkpoint, errors, transactions, users, disputes", () => {
    it("executes all auxiliary repositories properly", async () => {
      const mockPrisma = {
        attesterProfile: {
          findUnique: vi.fn().mockResolvedValue({ walletAddress: "GWALLET", active: true }),
          upsert: vi.fn().mockResolvedValue({ walletAddress: "GWALLET" }),
        },
        indexerCheckpoint: {
          findUnique: vi.fn().mockResolvedValue({ stream: "main", lastLedger: 500 }),
          upsert: vi.fn().mockResolvedValue({}),
        },
        indexerError: {
          create: vi.fn().mockResolvedValue({ errorId: "err-1" }),
          findUnique: vi.fn().mockResolvedValue({ errorId: "err-1" }),
          update: vi.fn().mockResolvedValue({}),
        },
        stellarTransaction: {
          upsert: vi.fn().mockResolvedValue({}),
        },
        user: {
          findUnique: vi.fn().mockResolvedValue({ id: "user-1" }),
          update: vi.fn().mockResolvedValue({}),
        },
        session: {
          deleteMany: vi.fn().mockResolvedValue({}),
        },
        businessProfile: {
          findUnique: vi.fn().mockResolvedValue({ id: "bp-1", walletAddress: "GWALLET" }),
          update: vi.fn().mockResolvedValue({}),
        },
        dispute: {
          findFirst: vi.fn().mockResolvedValue({ eventId: "ev-1" }),
          create: vi.fn().mockResolvedValue({ id: "disp-1" }),
        },
        $transaction: vi.fn(async (cb: (tx: unknown) => unknown) => cb(mockPrisma)),
      } as unknown as PrismaClient;

      const attester = await findAttesterByWallet(mockPrisma, "GWALLET");
      expect(attester?.active).toBe(true);

      await upsertAttester(mockPrisma, { walletAddress: "GWALLET", displayName: "Attester 1" });
      expect(mockPrisma.attesterProfile.upsert).toHaveBeenCalled();

      const checkpoint = await getCheckpoint(mockPrisma, "main");
      expect(checkpoint).toBe(500);

      await saveCheckpoint(mockPrisma, "main", 501);
      expect(mockPrisma.indexerCheckpoint.upsert).toHaveBeenCalled();

      const deadLetter = await writeDeadLetter(mockPrisma, {
        rawXdr: "xdr",
        stage: "parse",
        message: "failed",
      });
      expect(deadLetter.errorId).toBe("err-1");

      const err = await findDeadLetterByErrorId(mockPrisma, "err-1");
      expect(err?.errorId).toBe("err-1");

      await markDeadLetterResolved(mockPrisma, "err-1");
      await incrementDeadLetterRetry(mockPrisma, "err-1", "retry message");

      await upsertStellarTransaction(mockPrisma, {
        hash: "txhash",
        ledgerSequence: 100,
        successful: true,
        sourceAddress: "GSOURCE",
      });

      const user = await findUserById(mockPrisma, "user-1");
      expect(user?.id).toBe("user-1");

      await deleteUserAccount(mockPrisma, "user-1");
      expect(mockPrisma.$transaction).toHaveBeenCalled();

      const dispute = await findDisputeByEventId(mockPrisma, "ev-1");
      expect(dispute?.eventId).toBe("ev-1");

      const createdDispute = await createDispute(mockPrisma, {
        eventId: "ev-1",
        userId: "user-1",
        reasonPlaintext: "encrypted_reason",
        reasonHash: "hash",
      });
      expect(createdDispute.id).toBe("disp-1");
    });
  });
});
