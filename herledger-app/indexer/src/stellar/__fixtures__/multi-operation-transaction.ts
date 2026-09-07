import type { Horizon } from "@stellar/stellar-sdk";
import type { MinimalTransaction } from "../../types/index.js";

/**
 * A single successful transaction bundling three operations -- two
 * `payment`s (one native XLM, one issued asset) to the same business
 * wallet, plus one unrelated `create_account` operation -- exactly the
 * shape that previously undercounted a business's activity when only the
 * first operation was parsed. A fourth `payment` operation, tagged with a
 * *different* transaction hash, is included to assert that operations from
 * another transaction are never mixed in even if a caller's operation page
 * happens to contain them.
 */

export const TX_HASH = "9b92c828be97e9d8b09493167dbfb6297db1404b95997f6d6ad2bd6b5f2fa08d";
export const OTHER_TX_HASH = "f39a8acfc222317650401fcffee6195ba8cda84d26ac93d38a945853dec272e6";

export const COUNTERPARTY = "GCW657MV2KLCZJETWK2RX6FXSHDFZWSTCK57B7KLJSFHW4NCZ3EDYPY6";
export const BUSINESS_WALLET = "GDBOCARUIXMKYQMF6UND56BHP5LNMMWX5K4J4SPO3P7AXSDWMTX3QZQJ";
export const USDC_ISSUER = "GCGZYNRTHT2WEWOFRFD73SR6ST7I5MN5R3GODPQZJGNKRSSLSJ34RFH2";

export const MULTI_OP_TRANSACTION: MinimalTransaction = {
  hash: TX_HASH,
  successful: true,
  source_account: COUNTERPARTY,
  ledger_attr: 555_666,
};

export const MULTI_OP_OPERATIONS = [
  {
    type: "payment",
    transaction_hash: TX_HASH,
    transaction_successful: true,
    from: COUNTERPARTY,
    to: BUSINESS_WALLET,
    asset_type: "native",
    amount: "100.5000000",
  },
  {
    type: "payment",
    transaction_hash: TX_HASH,
    transaction_successful: true,
    from: COUNTERPARTY,
    to: BUSINESS_WALLET,
    asset_type: "credit_alphanum4",
    asset_code: "USDC",
    asset_issuer: USDC_ISSUER,
    amount: "250.0000000",
  },
  {
    // Not a payment -- must be skipped, not miscounted.
    type: "create_account",
    transaction_hash: TX_HASH,
    transaction_successful: true,
    account: BUSINESS_WALLET,
    funder: COUNTERPARTY,
    starting_balance: "10.0000000",
  },
  {
    // Belongs to a *different* transaction -- must never be attributed to
    // `MULTI_OP_TRANSACTION` even though it shares this operations page.
    type: "payment",
    transaction_hash: OTHER_TX_HASH,
    transaction_successful: true,
    from: COUNTERPARTY,
    to: BUSINESS_WALLET,
    asset_type: "native",
    amount: "999.0000000",
  },
] as unknown as Horizon.ServerApi.OperationRecord[];
