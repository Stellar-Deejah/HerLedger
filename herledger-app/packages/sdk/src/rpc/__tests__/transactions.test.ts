import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  Account,
  FeeBumpTransaction,
  Keypair,
  TransactionBuilder,
  rpc as StellarRpc,
} from "@stellar/stellar-sdk";
import type { StellarNetworkConfig } from "../../types/index.js";
import { ContractError } from "../../errors/index.js";

const { mockSimulate, mockSend, mockGetTransaction, mockSign } = vi.hoisted(() => ({
  mockSimulate: vi.fn(),
  mockSend: vi.fn(),
  mockGetTransaction: vi.fn(),
  mockSign: vi.fn(),
}));

vi.mock("../client.js", () => ({
  getSorobanRpcServer: () => ({
    simulateTransaction: mockSimulate,
    sendTransaction: mockSend,
    getTransaction: mockGetTransaction,
  }),
}));

vi.mock("../../wallet/freighter.js", () => ({
  signTransactionWithFreighter: mockSign,
}));

import { simulateAndPrepare, submitAndWait, submitWithFeeBump } from "../transactions.js";

const PASS = "Test SDF Network ; September 2015";

const config: StellarNetworkConfig = {
  network: "testnet",
  rpcUrl: "https://soroban-testnet.stellar.org",
  horizonUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: PASS,
};

// Random but valid StrKeys — `Account` validates the public key format.
const SOURCE = Keypair.random().publicKey();
const FEE_SOURCE = Keypair.random().publicKey();

function buildInnerTransaction(): import("@stellar/stellar-sdk").Transaction {
  const account = new Account(SOURCE, "0");
  return new TransactionBuilder(account, {
    fee: "1000000",
    networkPassphrase: PASS,
  })
    .setTimeout(300)
    .build();
}

function buildSignedXdr(): string {
  return buildInnerTransaction().toXDR();
}

function pendingSendResponse(overrides: Partial<StellarRpc.Api.SendTransactionResponse> = {}) {
  return {
    status: "PENDING" as const,
    hash: "deadbeef",
    latestLedger: 1000,
    latestLedgerCloseTime: 1700000000,
    ...overrides,
  };
}

function successGetResponse(overrides: Record<string, unknown> = {}) {
  return {
    status: StellarRpc.Api.GetTransactionStatus.SUCCESS,
    txHash: "deadbeef",
    ledger: 2000,
    latestLedger: 2000,
    latestLedgerCloseTime: 1700000000,
    oldestLedger: 1,
    oldestLedgerCloseTime: 1600000000,
    ...overrides,
  };
}

beforeEach(() => {
  vi.useRealTimers();
  mockSimulate.mockReset();
  mockSend.mockReset();
  mockGetTransaction.mockReset();
  mockSign.mockReset();
});

describe("simulateAndPrepare", () => {
  it("throws ContractError with code SIMULATION_ERROR when the RPC returns a simulation error", async () => {
    mockSimulate.mockResolvedValue({
      id: "req-1",
      latestLedger: 100,
      error: "HostError: tx_insufficient_fee",
      events: [],
      _parsed: true,
    });

    const tx = buildInnerTransaction();

    const promise = simulateAndPrepare(tx, config);

    await expect(promise).rejects.toMatchObject({
      kind: "ContractError",
      code: "SIMULATION_ERROR",
    });
    await expect(promise).rejects.toSatisfy(
      (err: unknown) => err instanceof ContractError && err.message.includes("tx_insufficient_fee")
    );
  });

  it("wraps a thrown RPC error in RpcError with code REQUEST_FAILED", async () => {
    mockSimulate.mockRejectedValue(new Error("rpc down"));

    await expect(simulateAndPrepare(buildInnerTransaction(), config)).rejects.toMatchObject({
      kind: "RpcError",
      code: "REQUEST_FAILED",
    });
  });
});

describe("submitAndWait", () => {
  it("retries TRY_AGAIN_LATER with exponential back-off and reports progress via onRetry", async () => {
    vi.useFakeTimers();
    try {
      mockSend
        .mockResolvedValueOnce(pendingSendResponse({ status: "TRY_AGAIN_LATER" }))
        .mockResolvedValueOnce(pendingSendResponse({ status: "TRY_AGAIN_LATER" }))
        .mockResolvedValueOnce(pendingSendResponse({ status: "PENDING" }));
      mockGetTransaction.mockResolvedValue(successGetResponse());

      const onRetry = vi.fn();
      const promise = submitAndWait(buildSignedXdr(), config, { onRetry });

      await vi.runAllTimersAsync();
      const result = await promise;

      expect(result).toEqual({ hash: "deadbeef", success: true, ledger: 2000 });
      expect(onRetry.mock.calls).toEqual([
        [{ attempt: 1, delayMs: 1000, status: "TRY_AGAIN_LATER" }],
        [{ attempt: 2, delayMs: 2000, status: "TRY_AGAIN_LATER" }],
      ]);
      expect(mockSend).toHaveBeenCalledTimes(3);
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns the confirmed transaction when the first submission is accepted", async () => {
    mockSend.mockResolvedValue(pendingSendResponse({ status: "PENDING" }));
    mockGetTransaction.mockResolvedValue(successGetResponse({ ledger: 42 }));

    const result = await submitAndWait(buildSignedXdr(), config, { pollIntervalMs: 0 });

    expect(result).toEqual({ hash: "deadbeef", success: true, ledger: 42 });
    expect(mockSend).toHaveBeenCalledTimes(1);
  });

  it("throws ContractError when the RPC rejects the transaction with ERROR", async () => {
    mockSend.mockResolvedValue(pendingSendResponse({ status: "ERROR", hash: "0".repeat(64) }));

    await expect(submitAndWait(buildSignedXdr(), config)).rejects.toBeInstanceOf(ContractError);
  });

  it("throws RpcError with code TRY_AGAIN_LATER_TIMEOUT when congestion never clears", async () => {
    vi.useFakeTimers();
    try {
      mockSend.mockResolvedValue(pendingSendResponse({ status: "TRY_AGAIN_LATER" }));

      const promise = submitAndWait(buildSignedXdr(), config, { maxWaitMs: 5_000 });

      // Attach the rejection handler before advancing so the rejection is
      // observed (not flagged as an unhandled rejection).
      const expectation = expect(promise).rejects.toMatchObject({
        kind: "RpcError",
        code: "TRY_AGAIN_LATER_TIMEOUT",
      });

      await vi.runAllTimersAsync();
      await expectation;
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("submitWithFeeBump", () => {
  it("wraps the inner transaction in a fee-bump envelope signed by feeSource", async () => {
    // Echo the XDR back through the signer so submitAndWait can parse it.
    mockSign.mockImplementation(async (xdr: string) => xdr);
    mockSend.mockResolvedValue(pendingSendResponse({ status: "PENDING" }));
    mockGetTransaction.mockResolvedValue(successGetResponse({ ledger: 99 }));

    const innerTx = buildInnerTransaction();
    const result = await submitWithFeeBump(innerTx, FEE_SOURCE, "10000000", config, {
      pollIntervalMs: 0,
    });

    expect(result).toEqual({ hash: "deadbeef", success: true, ledger: 99 });

    const [signedXdr, passphrase, accountToSign] = mockSign.mock.calls[0] as [
      string,
      string,
      string,
    ];
    expect(passphrase).toBe(PASS);
    expect(accountToSign).toBe(FEE_SOURCE);

    const parsed = TransactionBuilder.fromXDR(signedXdr, PASS);
    expect(parsed).toBeInstanceOf(FeeBumpTransaction);
    const feeBump = parsed as FeeBumpTransaction;
    expect(feeBump.feeSource).toBe(FEE_SOURCE);
    expect(feeBump.fee).toBe("10000000");
    expect(feeBump.innerTransaction.hash().toString("hex")).toBe(innerTx.hash().toString("hex"));
  });
});
