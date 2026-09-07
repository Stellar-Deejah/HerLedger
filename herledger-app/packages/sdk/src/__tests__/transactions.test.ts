import { describe, it, expect, vi, beforeEach } from "vitest";
import { Account, Contract, TransactionBuilder } from "@stellar/stellar-sdk";
import type { StellarNetworkConfig } from "../types/index.js";

const mockSimulateTransaction = vi.fn();
const mockSendTransaction = vi.fn();
const mockGetTransaction = vi.fn();

// vi.mock calls are hoisted above imports by vitest, so the static import of
// `../rpc/transactions.js` below picks up this mocked client.
vi.mock("../rpc/client.js", () => ({
  getSorobanRpcServer: () => ({
    simulateTransaction: mockSimulateTransaction,
    sendTransaction: mockSendTransaction,
    getTransaction: mockGetTransaction,
  }),
}));

import { simulateAndPrepare, submitAndWait } from "../rpc/transactions.js";

const CONFIG: StellarNetworkConfig = {
  network: "testnet",
  rpcUrl: "https://rpc.example.com",
  horizonUrl: "https://horizon-testnet.stellar.org",
  networkPassphrase: "Test SDF Network ; September 2015",
};

// Well-formed (StrKey-valid) placeholder identities — not real accounts/contracts.
const TEST_ACCOUNT_ID = "GBNV3QQD25EPHMEKAHTLQW2YRYLJ5UA6GI45BK2MUDOCWLOOBZECGUAG";
const TEST_CONTRACT_ID = "CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526";

function buildTx() {
  const account = new Account(TEST_ACCOUNT_ID, "0");
  const contract = new Contract(TEST_CONTRACT_ID);
  return new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: CONFIG.networkPassphrase,
  })
    .addOperation(contract.call("get_business"))
    .setTimeout(30)
    .build();
}

describe("simulateAndPrepare", () => {
  beforeEach(() => {
    mockSimulateTransaction.mockReset();
    vi.useRealTimers();
  });

  it("throws RpcError with code TIMEOUT when the RPC call exceeds timeoutMs", async () => {
    mockSimulateTransaction.mockReturnValue(new Promise(() => {})); // never resolves
    const tx = buildTx();

    await expect(
      simulateAndPrepare(tx, CONFIG, { timeoutMs: 20 })
    ).rejects.toMatchObject({ name: "RpcError", code: "TIMEOUT" });
  });

  it("throws RpcError with code TIMEOUT immediately given an already-aborted signal", async () => {
    mockSimulateTransaction.mockReturnValue(new Promise(() => {}));
    const tx = buildTx();
    const controller = new AbortController();
    controller.abort();

    await expect(
      simulateAndPrepare(tx, CONFIG, { signal: controller.signal })
    ).rejects.toMatchObject({ code: "TIMEOUT" });
  });

  it("wraps a rejected simulateTransaction call in RpcError REQUEST_FAILED", async () => {
    mockSimulateTransaction.mockRejectedValue(new Error("network down"));
    const tx = buildTx();

    await expect(simulateAndPrepare(tx, CONFIG)).rejects.toMatchObject({
      name: "RpcError",
      code: "REQUEST_FAILED",
    });
  });
});

describe("submitAndWait", () => {
  beforeEach(() => {
    mockSendTransaction.mockReset();
    mockGetTransaction.mockReset();
  });

  it("throws RpcError with code TIMEOUT when submission exceeds timeoutMs", async () => {
    mockSendTransaction.mockReturnValue(new Promise(() => {}));

    const account = new Account(TEST_ACCOUNT_ID, "0");
    const contract = new Contract(TEST_CONTRACT_ID);
    const tx = new TransactionBuilder(account, {
      fee: "100",
      networkPassphrase: CONFIG.networkPassphrase,
    })
      .addOperation(contract.call("get_business"))
      .setTimeout(30)
      .build();
    const signedXdr = tx.toXDR();

    await expect(
      submitAndWait(signedXdr, CONFIG, { timeoutMs: 20 })
    ).rejects.toMatchObject({ name: "RpcError", code: "TIMEOUT" });
  });

  it("invokes onSubmitted with the transaction hash once submission succeeds", async () => {
    vi.useFakeTimers();
    try {
      mockSendTransaction.mockResolvedValue({ status: "PENDING", hash: "abc123" });
      mockGetTransaction.mockResolvedValue({ status: "SUCCESS", ledger: 42 });

      const account = new Account(TEST_ACCOUNT_ID, "0");
      const contract = new Contract(TEST_CONTRACT_ID);
      const tx = new TransactionBuilder(account, {
        fee: "100",
        networkPassphrase: CONFIG.networkPassphrase,
      })
        .addOperation(contract.call("get_business"))
        .setTimeout(30)
        .build();
      const signedXdr = tx.toXDR();

      const onSubmitted = vi.fn();
      const resultPromise = submitAndWait(signedXdr, CONFIG, onSubmitted);

      // Let the submission's microtasks settle, then advance past the poll sleep.
      await vi.advanceTimersByTimeAsync(2_100);

      const result = await resultPromise;
      expect(onSubmitted).toHaveBeenCalledWith("abc123");
      expect(result).toEqual({ hash: "abc123", success: true, ledger: 42 });
    } finally {
      vi.useRealTimers();
    }
  });
});
