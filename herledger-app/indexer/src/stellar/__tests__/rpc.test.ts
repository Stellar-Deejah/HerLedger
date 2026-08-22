import { describe, it, expect, vi, beforeEach } from "vitest";

const { mockCall } = vi.hoisted(() => ({ mockCall: vi.fn() }));

vi.mock("@herledger/sdk", () => ({
  getSorobanRpcServer: () => ({}),
}));

vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  return {
    ...actual,
    Horizon: {
      ...actual.Horizon,
      Server: class {
        transactions() {
          return {
            forAccount() {
              return this;
            },
            order() {
              return this;
            },
            limit() {
              return this;
            },
            includeFailed() {
              return this;
            },
            cursor() {
              return this;
            },
            call: mockCall,
          };
        }
      },
    },
  };
});

import { fetchTransactionsForAccount } from "../rpc.js";

function makeTx(ledger: number, pagingToken: string) {
  return {
    ledger_attr: ledger,
    paging_token: pagingToken,
    successful: true,
    hash: `hash-${ledger}`,
    envelope_xdr: "AAAA",
  };
}

beforeEach(() => {
  mockCall.mockReset();
});

describe("fetchTransactionsForAccount", () => {
  it("returns only transactions newer than minLedger and stops at the checkpoint", async () => {
    // Newest-first page: ledger 300 (new) down to ledger 1 (old).
    mockCall.mockResolvedValue({
      records: [makeTx(300, "300-0"), makeTx(250, "250-0"), makeTx(200, "200-0")],
    });

    const result = await fetchTransactionsForAccount("GADDRESS", "https://horizon.example", {
      minLedger: 250,
    });

    expect(result.transactions.map((t) => t.ledger_attr)).toEqual([300]);
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns an empty page when every transaction is at or below minLedger", async () => {
    mockCall.mockResolvedValue({
      records: [makeTx(250, "250-0"), makeTx(200, "200-0")],
    });

    const result = await fetchTransactionsForAccount("GADDRESS", "https://horizon.example", {
      minLedger: 300,
    });

    expect(result.transactions).toHaveLength(0);
    expect(result.nextCursor).toBeUndefined();
  });

  it("returns all records when no minLedger is supplied", async () => {
    mockCall.mockResolvedValue({
      records: [makeTx(300, "300-0"), makeTx(250, "250-0")],
    });

    const result = await fetchTransactionsForAccount("GADDRESS", "https://horizon.example");

    expect(result.transactions.map((t) => t.ledger_attr)).toEqual([300, 250]);
    expect(result.nextCursor).toBe("250-0");
  });
});
