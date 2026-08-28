import { Asset, Networks } from "@stellar/stellar-sdk";
import { describe, it, expect } from "vitest";

import {
  parsePaymentsFromTransaction,
  isSupportedAssetAddress,
  parseAmount,
} from "../transactions.js";
import {
  MULTI_OP_TRANSACTION,
  MULTI_OP_OPERATIONS,
  BUSINESS_WALLET,
  COUNTERPARTY,
  USDC_ISSUER,
  TX_HASH,
} from "../__fixtures__/multi-operation-transaction.js";

describe("parsePaymentsFromTransaction", () => {
  it("emits one ParsedPayment per payment operation in a multi-operation transaction", () => {
    const payments = parsePaymentsFromTransaction(
      MULTI_OP_TRANSACTION,
      MULTI_OP_OPERATIONS,
      Networks.TESTNET
    );

    expect(payments).toHaveLength(2);

    expect(payments[0]).toEqual({
      transactionHash: TX_HASH,
      ledgerSequence: MULTI_OP_TRANSACTION.ledger_attr,
      successful: true,
      sourceAddress: COUNTERPARTY,
      destinationAddress: BUSINESS_WALLET,
      assetAddress: Asset.native().contractId(Networks.TESTNET),
      amount: 1_005_000_000n,
    });

    expect(payments[1]).toEqual({
      transactionHash: TX_HASH,
      ledgerSequence: MULTI_OP_TRANSACTION.ledger_attr,
      successful: true,
      sourceAddress: COUNTERPARTY,
      destinationAddress: BUSINESS_WALLET,
      assetAddress: new Asset("USDC", USDC_ISSUER).contractId(Networks.TESTNET),
      amount: 2_500_000_000n,
    });
  });

  it("skips non-payment operations and operations belonging to a different transaction", () => {
    const payments = parsePaymentsFromTransaction(
      MULTI_OP_TRANSACTION,
      MULTI_OP_OPERATIONS,
      Networks.TESTNET
    );

    // create_account op and the payment tagged with a different tx hash are
    // both excluded -- only the 2 payments belonging to this transaction remain.
    expect(payments.every((p) => p.transactionHash === TX_HASH)).toBe(true);
    expect(payments).toHaveLength(2);
  });

  it("returns no payments for a failed transaction, regardless of its operations", () => {
    const payments = parsePaymentsFromTransaction(
      { ...MULTI_OP_TRANSACTION, successful: false },
      MULTI_OP_OPERATIONS,
      Networks.TESTNET
    );

    expect(payments).toEqual([]);
  });
});

describe("isSupportedAssetAddress", () => {
  it("checks membership in the provided set", () => {
    const supported = new Set(["CABC"]);
    expect(isSupportedAssetAddress("CABC", supported)).toBe(true);
    expect(isSupportedAssetAddress("CXYZ", supported)).toBe(false);
  });
});

describe("parseAmount", () => {
  it("parses an integer string directly", () => {
    expect(parseAmount("12345")).toBe(12345n);
  });

  it("parses a decimal Horizon amount into 7-decimal stroops", () => {
    expect(parseAmount("10.0000000")).toBe(100_000_000n);
    expect(parseAmount("0.0000001")).toBe(1n);
  });
});
