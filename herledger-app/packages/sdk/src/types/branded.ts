// ---------------------------------------------------------------------------
// Branded (nominal) types.
//
// TypeScript's structural typing means a raw `string` is interchangeable
// anywhere a `string` is expected — including passing the wrong contract's
// address to a function that expects a different contract entirely. Branding
// closes that hole at compile time: a `ContractAddress` can only be produced
// by `toContractAddress()`, which validates the value against the
// `CONTRACT_ADDRESSES` registry (see `contracts/registry.ts`) before it is
// allowed to exist.
// ---------------------------------------------------------------------------

declare const __brand: unique symbol;

/** Attaches a nominal tag `B` to base type `T` so the two are no longer structurally interchangeable. */
export type Brand<T, B extends string> = T & { readonly [__brand]: B };

/**
 * A Stellar contract address (`C...`) that has been validated against the
 * `CONTRACT_ADDRESSES` registry for a known contract name and network.
 *
 * Do not construct this via a type assertion (`as ContractAddress`) outside
 * of `contracts/registry.ts` — that defeats the purpose of the brand. Always
 * go through `toContractAddress()`.
 */
export type ContractAddress = Brand<string, "ContractAddress">;

/**
 * A 32-byte value hex-encoded as a 64-character string (e.g. business IDs,
 * event IDs, metadata hashes). Not currently enforced at every call site in
 * the SDK, but new call sites should prefer this over raw `string`.
 */
export type HexString32 = Brand<string, "HexString32">;
