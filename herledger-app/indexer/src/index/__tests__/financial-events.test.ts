import { describe, it, expect, vi, beforeEach } from "vitest";
import { createHash } from "node:crypto";
import { indexPayment, deriveEventId } from "../financial-events.js";
import { upsertFinancialEvent } from "../../db/schema/financial-events.js";
import { upsertStellarTransaction } from "../../db/schema/stellar-transactions.js";
import { resetMetrics, getMetrics } from "../../observability/index.js";
import type { ParsedPayment } from "../../types/index.js";

const isSupportedAssetMock = vi.fn().mockResolvedValue(true);
vi.mock("@herledger/sdk", () => ({
  isSupportedAsset: (...args: unknown[]) => isSupportedAssetMock(...args),
}));

vi.mock("../../db/schema/financial-events.js", () => ({
  upsertFinancialEvent: vi.fn().mockResolvedValue({}),
}));

vi.mock("../../db/schema/stellar-transactions.js", () => ({
  upsertStellarTransaction: vi.fn().mockResolvedValue({}),
}));

// Aliases so the rest of this file can keep referring to "...Mock" without
// every call site needing `vi.mocked(...)` -- these are the same vi.fn()
// instances the mocked modules above export, just referenced directly (both
// upsertFinancialEvent/upsertStellarTransaction are called with the `tx`
// object indexPayment's `prisma.$transaction(...)` callback receives, not
// the outer `prisma` passed into indexPayment -- see mockPrisma below).
const upsertFinancialEventMock = vi.mocked(upsertFinancialEvent);
const upsertStellarTransactionMock = vi.mocked(upsertStellarTransaction);

vi.mock("../../db/schema/businesses.js", () => ({
  findBusinessByWallet: vi.fn((_prisma, address: string) => {
    if (address === "GBUSINESS_RECV") {
      return Promise.resolve({ businessId: "biz-recv-123", walletAddress: address });
    }
    if (address === "GBUSINESS_SENT") {
      return Promise.resolve({ businessId: "biz-sent-456", walletAddress: address });
    }
    if (address === "GBUSINESS_SELF") {
      return Promise.resolve({ businessId: "biz-self-789", walletAddress: address });
    }
    return Promise.resolve(null);
  }),
}));

describe("Financial Events Indexing & Metrics", () => {
  const transactionMock = vi.fn(async (fn: (tx: unknown) => Promise<void>) => fn({}));
  const mockPrisma = {
    $transaction: transactionMock,
  } as unknown as import("@prisma/client").PrismaClient;
  const mockConfig = {
    network: "testnet",
  } as unknown as import("@herledger/sdk").StellarNetworkConfig;
  const mockContracts = {} as unknown as import("@herledger/sdk").ContractConfig;

  beforeEach(() => {
    resetMetrics();
    vi.clearAllMocks();
    isSupportedAssetMock.mockResolvedValue(true);
  });

  // -- EventType coverage -----------------------------------------------
  // indexPayment is a payment classifier; of the four EventType variants
  // declared in prisma/schema.prisma (PaymentReceived, PaymentSent,
  // InvoiceSettled, CommitmentFulfilled) only the first two are ever
  // produced here — InvoiceSettled/CommitmentFulfilled are emitted by
  // other indexing paths (business/attestation lifecycle), not indexPayment,
  // and are out of scope for this function's tests.

  it("increments events_indexed_total with PaymentReceived when business is recipient", async () => {
    const payment: ParsedPayment = {
      transactionHash: "a".repeat(64),
      ledgerSequence: 12345,
      successful: true,
      sourceAddress: "GCUSTOMER_SENDER",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET_SUPPORTED",
      amount: 50000000n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    const metrics = await getMetrics();
    expect(metrics).toContain(
      'events_indexed_total{event_type="PaymentReceived",status="Pending"} 1'
    );
  });

  it("increments events_indexed_total with PaymentSent when business is sender", async () => {
    const payment: ParsedPayment = {
      transactionHash: "b".repeat(64),
      ledgerSequence: 12346,
      successful: true,
      sourceAddress: "GBUSINESS_SENT",
      destinationAddress: "GOTHER_RECIPIENT",
      assetAddress: "CASSET_SUPPORTED",
      amount: 25000000n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    const metrics = await getMetrics();
    expect(metrics).toContain('events_indexed_total{event_type="PaymentSent",status="Pending"} 1');
  });

  it("does not increment metrics if transaction was unsuccessful", async () => {
    const payment: ParsedPayment = {
      transactionHash: "c".repeat(64),
      ledgerSequence: 12347,
      successful: false,
      sourceAddress: "GCUSTOMER",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET",
      amount: 1000n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    const metrics = await getMetrics();
    expect(metrics).not.toContain("events_indexed_total{");
    expect(upsertFinancialEventMock).not.toHaveBeenCalled();
    expect(upsertStellarTransactionMock).not.toHaveBeenCalled();
  });

  it("skips indexing entirely when the asset is unsupported", async () => {
    isSupportedAssetMock.mockResolvedValueOnce(false);
    const payment: ParsedPayment = {
      transactionHash: "d".repeat(64),
      ledgerSequence: 12348,
      successful: true,
      sourceAddress: "GCUSTOMER",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET_UNSUPPORTED",
      amount: 1000n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    expect(upsertStellarTransactionMock).not.toHaveBeenCalled();
    expect(upsertFinancialEventMock).not.toHaveBeenCalled();
    const metrics = await getMetrics();
    expect(metrics).not.toContain("events_indexed_total{");
  });

  it("does not record a financial event when neither party is a registered business", async () => {
    const payment: ParsedPayment = {
      transactionHash: "e".repeat(64),
      ledgerSequence: 12349,
      successful: true,
      sourceAddress: "GUNKNOWN_SENDER",
      destinationAddress: "GUNKNOWN_RECIPIENT",
      assetAddress: "CASSET_SUPPORTED",
      amount: 500n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    // The raw transaction is still recorded for a successful, supported-asset
    // payment even when no business is involved.
    expect(upsertStellarTransactionMock).toHaveBeenCalledTimes(1);
    expect(upsertFinancialEventMock).not.toHaveBeenCalled();
  });

  it("records both PaymentReceived and PaymentSent when a business pays itself", async () => {
    const payment: ParsedPayment = {
      transactionHash: "f".repeat(64),
      ledgerSequence: 12350,
      successful: true,
      sourceAddress: "GBUSINESS_SELF",
      destinationAddress: "GBUSINESS_SELF",
      assetAddress: "CASSET_SUPPORTED",
      amount: 750n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    expect(upsertFinancialEventMock).toHaveBeenCalledTimes(2);
    const eventTypes = upsertFinancialEventMock.mock.calls.map(
      (call) => (call[1] as { eventType: string }).eventType
    );
    expect(eventTypes.sort()).toEqual(["PaymentReceived", "PaymentSent"]);
  });

  it("always records the raw stellar transaction for a successful, supported-asset payment", async () => {
    const payment: ParsedPayment = {
      transactionHash: "1".repeat(64),
      ledgerSequence: 999,
      successful: true,
      sourceAddress: "GCUSTOMER",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET_SUPPORTED",
      amount: 1n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    expect(upsertStellarTransactionMock).toHaveBeenCalledWith(
      // The write happens inside prisma.$transaction(async (tx) => ...), so
      // this receives the transaction client the callback was invoked with,
      // not `mockPrisma` itself.
      expect.anything(),
      expect.objectContaining({
        hash: payment.transactionHash,
        ledgerSequence: payment.ledgerSequence,
        successful: true,
        sourceAddress: payment.sourceAddress,
      })
    );
  });

  it("sets status Pending and a zeroed metadataHash on every recorded event", async () => {
    const payment: ParsedPayment = {
      transactionHash: "2".repeat(64),
      ledgerSequence: 1000,
      successful: true,
      sourceAddress: "GCUSTOMER",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET_SUPPORTED",
      amount: 42n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    expect(upsertFinancialEventMock).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        status: "Pending",
        metadataHash: "0".repeat(64),
        businessId: "biz-recv-123",
        eventType: "PaymentReceived",
        assetAddress: payment.assetAddress,
        amount: payment.amount,
        stellarReference: payment.transactionHash,
        ledgerSequence: payment.ledgerSequence,
      })
    );
  });

  // -- deriveEventId (now exported and directly testable) --

  it("derives a deterministic, direction-suffixed eventId for a received payment", async () => {
    const txHash = "3".repeat(64);
    const payment: ParsedPayment = {
      transactionHash: txHash,
      ledgerSequence: 1,
      successful: true,
      sourceAddress: "GCUSTOMER",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET_SUPPORTED",
      amount: 10n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    const call = upsertFinancialEventMock.mock.calls[0]![1] as { eventId: string };
    const expected = deriveEventId(txHash, "recv");
    expect(call.eventId).toBe(expected);
    expect(call.eventId).toHaveLength(64);
  });

  it("derives a different, direction-suffixed eventId for a sent payment from the same hash", async () => {
    const txHash = "4".repeat(64);
    const payment: ParsedPayment = {
      transactionHash: txHash,
      ledgerSequence: 2,
      successful: true,
      sourceAddress: "GBUSINESS_SENT",
      destinationAddress: "GOTHER",
      assetAddress: "CASSET_SUPPORTED",
      amount: 10n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    const call = upsertFinancialEventMock.mock.calls[0]![1] as { eventId: string };
    expect(call.eventId).toBe(deriveEventId(txHash, "sent"));
  });

  it("derives distinct recv/sent eventIds from the same transaction hash for a self-payment", async () => {
    const txHash = "5".repeat(64);
    const payment: ParsedPayment = {
      transactionHash: txHash,
      ledgerSequence: 3,
      successful: true,
      sourceAddress: "GBUSINESS_SELF",
      destinationAddress: "GBUSINESS_SELF",
      assetAddress: "CASSET_SUPPORTED",
      amount: 10n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    const eventIds = upsertFinancialEventMock.mock.calls.map(
      (call) => (call[1] as { eventId: string }).eventId
    );
    expect(eventIds).toHaveLength(2);
    expect(new Set(eventIds).size).toBe(2);
    expect(eventIds).toContain(deriveEventId(txHash, "recv"));
    expect(eventIds).toContain(deriveEventId(txHash, "sent"));
  });

  it("is idempotent — processing the same payment twice derives the same eventId both times", async () => {
    const txHash = "6".repeat(64);
    const payment: ParsedPayment = {
      transactionHash: txHash,
      ledgerSequence: 4,
      successful: true,
      sourceAddress: "GCUSTOMER",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET_SUPPORTED",
      amount: 10n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);
    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    const eventIds = upsertFinancialEventMock.mock.calls.map(
      (call) => (call[1] as { eventId: string }).eventId
    );
    expect(eventIds[0]).toBe(eventIds[1]);
  });

  it("writes the Stellar transaction and derived events inside a single $transaction", async () => {
    const payment: ParsedPayment = {
      transactionHash: "d".repeat(64),
      ledgerSequence: 12348,
      successful: true,
      sourceAddress: "GBUSINESS_SENT",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET_SUPPORTED",
      amount: 100000n,
    };

    await indexPayment(mockPrisma, payment, mockConfig, mockContracts);

    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(transactionMock).toHaveBeenCalledWith(expect.any(Function));
  });

  it("rolls back the whole payment when a write inside the transaction fails", async () => {
    const payment: ParsedPayment = {
      transactionHash: "e".repeat(64),
      ledgerSequence: 12349,
      successful: true,
      sourceAddress: "GBUSINESS_SENT",
      destinationAddress: "GBUSINESS_RECV",
      assetAddress: "CASSET_SUPPORTED",
      amount: 100000n,
    };

    // Fail the second write (sender event). indexPayment must propagate the
    // error out of the transaction so Prisma rolls back the entire payment.
    upsertFinancialEventMock
      .mockResolvedValueOnce(undefined)
      .mockRejectedValueOnce(new Error("simulated write failure"));

    await expect(indexPayment(mockPrisma, payment, mockConfig, mockContracts)).rejects.toThrow(
      "simulated write failure"
    );
    expect(transactionMock).toHaveBeenCalledTimes(1);
  });
});

describe("deriveEventId", () => {
  it("produces a 64-character hex string", () => {
    const id = deriveEventId("a".repeat(64), "recv");
    expect(id).toHaveLength(64);
    expect(/^[0-9a-f]{64}$/.test(id)).toBe(true);
  });

  it("is deterministic — same input always produces the same output", () => {
    const hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    const id1 = deriveEventId(hash, "recv");
    const id2 = deriveEventId(hash, "recv");
    expect(id1).toBe(id2);
  });

  it("produces different IDs for recv vs sent on the same hash", () => {
    const hash = "a".repeat(64);
    const recv = deriveEventId(hash, "recv");
    const sent = deriveEventId(hash, "sent");
    expect(recv).not.toBe(sent);
  });

  it("produces different IDs for different transaction hashes", () => {
    const id1 = deriveEventId("a".repeat(64), "recv");
    const id2 = deriveEventId("b".repeat(64), "recv");
    expect(id1).not.toBe(id2);
  });

  it("uses SHA-256 of (txHash:suffix) — not truncation", () => {
    // The old algorithm was txHash.slice(0, 62) + suffix
    // The new algorithm is SHA-256(txHash:suffix)
    // Verify by computing the expected SHA-256 manually
    const hash = "deadbeef".repeat(8); // 64 hex chars
    const suffix = "00";
    const expected = createHash("sha256").update(`${hash}:${suffix}`).digest("hex");
    expect(deriveEventId(hash, "recv")).toBe(expected);
  });
});
