# @herledger/sdk

TypeScript SDK for HerLedger's Soroban contracts, wallet adapter, and
Stellar/Soroban RPC helpers.

- [`contracts/`](./src/contracts) — typed clients for BusinessRegistry,
  FinancialLedger, and AttestationRegistry, plus centralized XDR encoding.
- [`rpc/`](./src/rpc) — Soroban RPC client factory and the transaction
  lifecycle (simulate → prepare → submit → confirm), with multi-endpoint
  failover.
- [`wallet/`](./src/wallet) — Freighter wallet adapter (signer only, not auth).
- [`types/`](./src/types) — shared application and network types.
- [`errors/`](./src/errors) — typed error classes with a `kind` discriminator.
- [`cache/`](./src/cache) — the in-memory TTL query cache used by read-only
  contract calls.

## Query caching

Read-only contract calls (`getBusiness`, `getBusinessByWallet`, `getFinancialEvent`,
`getBusinessEvents`, `isSupportedAsset`, `getAttestation`, `isValidAttestation`) are
served through an in-memory TTL cache (`packages/sdk/src/cache/query-cache.ts`):

- **De-duplication**: concurrent identical calls (same contract id + method + args)
  share a single in-flight RPC request instead of issuing one each.
- **TTL**: cached results expire after `ttlMs`, which defaults to **30 seconds**.
  Override per call: `getBusiness(id, config, contracts, { ttlMs: 5_000 })`.
- **Opt-out**: pass `{ bypassCache: true }` to force a fresh RPC call for that
  invocation.
- **Mutation invalidation**: write functions (`registerBusiness`,
  `updateBusinessMetadata`, `recordFinancialEvent`, `createAttestation`, ...)
  invalidate the cache entries their contract method affects after a successful
  `submitAndWait`, so a read immediately after a write does not see a stale value.
- **Manual control**: `clearQueryCache()` clears everything (handy in tests);
  `defaultQueryCache.invalidate(key)` / `.clear()` are also exported for
  advanced use, along with the `QueryCache` class itself if you want a
  separate, non-shared cache instance.

**Why a module-level singleton is safe under SSR/Edge**: cached values are
read-only, publicly observable contract state — the answer to "what is
business X" is the same no matter which request or user asked. Sharing the
cache across concurrent requests in the same process/isolate is what enables
de-duplication; it introduces no per-user data leakage, and the default 30s
TTL bounds any staleness from sharing across requests. Serverless/Edge
runtimes spin up a fresh module instance (and therefore an empty cache) per
isolate, so there's no risk of a *durable* cross-deployment cache. Callers
needing hard per-request isolation can construct their own `new QueryCache()`
or pass `{ bypassCache: true }`.

## RPC timeouts

`simulateAndPrepare` accepts an optional third argument, and `submitAndWait`
accepts an optional trailing options argument:

```ts
simulateAndPrepare(tx, config, { timeoutMs: 10_000 });
simulateAndPrepare(tx, config, { signal: myAbortController.signal });
```

- `timeoutMs` defaults to **30 000ms**.
- A timed-out call, or one whose `signal` fires, rejects with `RpcError` whose
  `code` is `"TIMEOUT"`.
- `submitAndWait`'s confirmation poll loop (which can legitimately run longer
  than a single RPC call's deadline) additionally checks `signal` between
  polls, so an aborted signal stops polling early even though it isn't itself
  bounded by `timeoutMs`.

Both parameters are optional and additive — existing two-argument call sites
are unaffected.

## Transaction lifecycle

`submitAndWait` submits a signed transaction and polls until it is confirmed or
rejected. It implements the reliability behaviour recommended in the
[Stellar transaction-submission guide](https://developers.stellar.org/docs/build/guides/basics/submit-transaction).

The confirmation poll loop's total wait budget defaults to 60s and is
configurable via `maxWaitMs`; the interval between polls defaults to 2s and is
configurable via `pollIntervalMs`.

```ts
import { submitAndWait } from "@herledger/sdk";

const result = await submitAndWait(signedXdr, config, {
  maxWaitMs: 90_000,
  timeoutMs: 10_000,
  signal: myAbortController.signal,
});
```

`submitAndWait`'s third argument may instead be an `onSubmitted` callback
(`(hash: string) => void`), fired right after the network accepts the
submission but before polling starts — the earliest point a caller can
durably persist "this transaction is in flight" (e.g. to localStorage) so a
resumed session can pick up polling via `pollTransactionStatus` instead of
losing track of an on-chain submission that outlived the page that made it.

### Fee-bump support

A transaction rejected with `tx_insufficient_fee` during congestion can be
recovered by wrapping it in a fee-bump envelope, where a separate `feeSource`
account pays a higher fee. The inner transaction is unchanged (same source,
sequence number, and signatures).

```ts
import { submitAndWait, submitWithFeeBump } from "@herledger/sdk";
import { TransactionBuilder } from "@stellar/stellar-sdk";

try {
  await submitAndWait(signedXdr, config);
} catch (err) {
  // Reconstruct the signed inner transaction, then bump its fee.
  const innerTx = TransactionBuilder.fromXDR(signedXdr, config.networkPassphrase);
  const result = await submitWithFeeBump(innerTx, feeSource, "10000000", config);
}
```

`submitWithFeeBump(innerTx, feeSource, maxFee, config, options?)` builds the
fee-bump envelope with `@stellar/stellar-sdk`'s
`TransactionBuilder.buildFeeBumpTransaction`, signs it with Freighter as
`feeSource`, then hands off to `submitAndWait`. `maxFee` is the maximum total
fee the fee source will pay, in stroops — the Stellar docs recommend `>= 10x`
the original fee.

### Simulation error validation

`simulateAndPrepare` validates the RPC simulation result before assembling a
transaction. If the simulation returns an error (e.g. a contract call failed,
or contract state changed between simulation and submission), it throws a
`ContractError` with `code === "SIMULATION_ERROR"` instead of submitting a
transaction doomed to fail on-chain.

## Error hierarchy

Every SDK error extends `Error` and carries:

- `code` — a `string` enum specific to that error class (see tables below).
- `context` — an optional, class-specific typed payload with structured
  detail (e.g. `{ timeoutMs }`, `{ contractCode, method }`).
- `cause` — the underlying error/value, if any (standard `Error.cause`).

```ts
import { RpcError, RpcErrorCode, assertUnreachable, type AppError } from "@herledger/sdk";

function handle(error: AppError) {
  switch (error.kind) {
    case "WalletError":
      /* ... */ break;
    case "RpcError":
      switch (error.code) {
        case RpcErrorCode.TIMEOUT:
          /* retry */ break;
        case RpcErrorCode.ALL_ENDPOINTS_UNAVAILABLE:
        case RpcErrorCode.NO_ENDPOINTS_CONFIGURED:
        case RpcErrorCode.REQUEST_FAILED:
        case RpcErrorCode.TRANSACTION_NOT_CONFIRMED:
        case RpcErrorCode.SIMULATION_FAILED:
        case RpcErrorCode.SUBMIT_FAILED:
        case RpcErrorCode.POLL_FAILED:
        case RpcErrorCode.POLL_TIMEOUT:
        case RpcErrorCode.ABORTED:
          /* surface to user */ break;
      }
      break;
    case "ContractError":
    case "ValidationError":
    case "AuthenticationError":
      /* ... */ break;
    default:
      return assertUnreachable(error);
  }
}
```

`assertUnreachable` makes the `default` branch a compile error if a new
`AppError` subtype is ever added without being handled.

### Error codes

**`WalletError`** (`WalletErrorCode`): `NOT_INSTALLED`, `ACCESS_DENIED`,
`SIGNING_REJECTED`, `ADDRESS_UNAVAILABLE`, `UNAVAILABLE`, `UNKNOWN`.

**`RpcError`** (`RpcErrorCode`): `REQUEST_FAILED`, `TIMEOUT`,
`ALL_ENDPOINTS_UNAVAILABLE`, `NO_ENDPOINTS_CONFIGURED`,
`TRANSACTION_NOT_CONFIRMED`, `SIMULATION_FAILED`, `SUBMIT_FAILED`,
`POLL_FAILED`, `POLL_TIMEOUT`, `ABORTED`.

**`ContractError`** (`ContractErrorCode`): `SIMULATION_ERROR`,
`SUBMISSION_ERROR`, `ON_CHAIN_FAILURE`, `DECODE_ERROR`, `ENCODE_ERROR`,
`UNKNOWN_VARIANT`.

**`ValidationError`** (`ValidationErrorCode`): `MALFORMED_INPUT`,
`ADDRESS_NOT_REGISTERED`, `ADDRESS_MISMATCH`.

**`AuthenticationError`** (`AuthenticationErrorCode`): `UNAUTHENTICATED`,
`FORBIDDEN`, `SESSION_EXPIRED` — reserved for callers layering authentication
on top of the SDK; the SDK itself does not currently throw this error.

See `packages/sdk/src/errors/index.ts` for the full JSDoc on each code and
context shape.
