import { xdr, Address, nativeToScVal, scValToNative } from "@stellar/stellar-sdk";
import { ContractError, ValidationError } from "../errors/index.js";
import type { HexString32 } from "../types/branded.js";

// ---------------------------------------------------------------------------
// Centralized XDR encoding/decoding utilities for Soroban contract calls.
// Never construct raw XDR strings manually.
// ---------------------------------------------------------------------------

const HEX32_PATTERN = /^[0-9a-fA-F]{64}$/;

/**
 * Validate that a string is a 64-character hex string (32 bytes) and return
 * it branded as `HexString32`. Throws `ValidationError` for non-hex or
 * wrong-length input so the failure surfaces at the call site with a clear
 * message instead of silently truncating or erroring deep inside the XDR
 * library.
 */
export function toHexString32(input: string): HexString32 {
  if (!HEX32_PATTERN.test(input)) {
    throw new ValidationError(
      `Expected a 64-character hexadecimal string (32 bytes), got ${JSON.stringify(input)} (length ${input.length})`
    );
  }
  return input as HexString32;
}

/**
 * Encode a hex string (32 bytes) as a Soroban Bytes ScVal.
 * Accepts only a validated `HexString32` — plain `string` is a compile error,
 * preventing silent truncation or zero-padding of non-32-byte inputs.
 */
export function encodeBytes32(hex: HexString32): xdr.ScVal {
  const bytes = hexToBytes(hex);
  if (bytes.length !== 32) {
    throw new ValidationError(`Expected 32-byte hex string, got ${bytes.length} bytes`);
  }
  return xdr.ScVal.scvBytes(Buffer.from(bytes));
}

/**
 * Encode a Stellar address string as a Soroban `Address` ScVal.
 *
 * @param address - A `G...` (or muxed `M...`) Stellar public key.
 * @returns An `xdr.ScVal` address value.
 * @throws {Error} if `address` is not a well-formed Stellar StrKey.
 *
 * @example
 * ```ts
 * const walletScVal = encodeAddress("GABCDEFGHIJKLMNOPQRSTUVWXYZ234567ABCDEFGHIJKLMNOPQRSTUVWX");
 * ```
 */
export function encodeAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

/**
 * Encode a bigint as an i128 ScVal.
 *
 * @param value - The i128 amount to encode. May be negative.
 * @returns An `xdr.ScVal` i128 value.
 *
 * @example
 * ```ts
 * const amountScVal = encodeI128(10000000n);
 * ```
 */
export function encodeI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

/**
 * Encode a boolean as a Soroban bool ScVal.
 *
 * @param value - The boolean to encode.
 * @returns An `xdr.ScVal` bool value.
 *
 * @example
 * ```ts
 * const validScVal = encodeBool(true);
 * ```
 */
export function encodeBool(value: boolean): xdr.ScVal {
  return xdr.ScVal.scvBool(value);
}

/**
 * Encode a u32 as a Soroban uint32 ScVal.
 *
 * @param value - A non-negative integer within the u32 range.
 * @returns An `xdr.ScVal` u32 value.
 *
 * @example
 * ```ts
 * const limitScVal = encodeU32(20);
 * ```
 */
export function encodeU32(value: number): xdr.ScVal {
  return xdr.ScVal.scvU32(value);
}

/**
 * Decode a Soroban `Bytes` ScVal into a hex string.
 *
 * @param val - An `xdr.ScVal` holding bytes.
 * @returns The lowercase hex encoding of the bytes.
 *
 * @example
 * ```ts
 * const businessId = decodeBytes32(retval);
 * ```
 */
export function decodeBytes32(val: xdr.ScVal): string {
  const bytes = val.bytes();
  return Buffer.from(bytes).toString("hex");
}

/**
 * Decode a Soroban `Address` ScVal to a Stellar address string.
 *
 * @param val - An `xdr.ScVal` holding an address.
 * @returns The `G...` (or muxed) address string.
 *
 * @example
 * ```ts
 * const wallet = decodeAddress(fields.wallet);
 * ```
 */
export function decodeAddress(val: xdr.ScVal): string {
  return Address.fromScVal(val).toString();
}

/**
 * Decode an i128 ScVal to a bigint. Never casts through `Number`, so large
 * amounts preserve full precision.
 *
 * @param val - An `xdr.ScVal` holding an i128.
 * @returns The decoded value as a `bigint`.
 *
 * @example
 * ```ts
 * const amount = decodeI128(fields.amount);
 * ```
 */
export function decodeI128(val: xdr.ScVal): bigint {
  const native = scValToNative(val);
  if (typeof native === "bigint") return native;
  return BigInt(String(native));
}

/**
 * Decode a u64 ScVal to a bigint.
 *
 * @param val - An `xdr.ScVal` holding a u64.
 * @returns The decoded value as a `bigint`.
 *
 * @example
 * ```ts
 * const ledger = decodeU64(fields.created_at);
 * ```
 */
export function decodeU64(val: xdr.ScVal): bigint {
  const native = scValToNative(val);
  if (typeof native === "bigint") return native;
  return BigInt(String(native));
}

/**
 * Decode a Soroban bool ScVal.
 *
 * @param val - An `xdr.ScVal` holding a bool.
 * @returns The decoded boolean.
 *
 * @example
 * ```ts
 * const active = decodeBool(fields.active);
 * ```
 */
export function decodeBool(val: xdr.ScVal): boolean {
  return val.b();
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Convert a hex string to bytes. Throws `ValidationError` with a descriptive
 * message for odd-length or non-hex input before delegating to the XDR
 * library, so callers never hit an opaque runtime error deep inside Soroban.
 */
export function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new ValidationError(
      `Invalid hex string: odd number of characters (${clean.length}). Expected an even-length hex string.`
    );
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    if (isNaN(byte)) {
      throw new ValidationError(`Invalid hex string: non-hex character at position ${i}.`);
    }
    bytes[i / 2] = byte;
  }
  return bytes;
}