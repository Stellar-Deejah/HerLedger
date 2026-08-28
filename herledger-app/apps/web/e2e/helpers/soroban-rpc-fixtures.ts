import { xdr } from "@stellar/stellar-sdk";

// ---------------------------------------------------------------------------
// Minimal, structurally-valid Soroban RPC response fixtures for
// business-registration.spec.ts's resume-on-reload test.
//
// `@stellar/stellar-sdk`'s Server.getTransaction() runs a SUCCESS response
// through TransactionMeta/TransactionResult/TransactionEnvelope XDR parsing
// even though submitAndWait/pollTransactionStatus (packages/sdk/src/rpc/transactions.ts)
// only reads `.status` and `.ledger` off the result -- an empty or made-up
// base64 string throws there. These are built with the real xdr classes
// (not hand-rolled base64) so the shapes are guaranteed valid, using the
// simplest legal value for each: zero classic operations in the meta, an
// empty successful operation-result list, and a throwaway signed envelope.
// ---------------------------------------------------------------------------

/** Base64 XDR for an empty (v0, no operations) TransactionMeta. */
export function emptyTransactionMetaXdr(): string {
  return new xdr.TransactionMeta(0, []).toXDR("base64");
}

/** Base64 XDR for a minimal successful TransactionResult (no operations). */
export function successfulTransactionResultXdr(feeCharged = "100"): string {
  const result = new xdr.TransactionResult({
    feeCharged: xdr.Int64.fromString(feeCharged),
    result: xdr.TransactionResultResult.txSuccess([]),
    ext: new xdr.TransactionResultExt(0),
  });
  return result.toXDR("base64");
}
