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
 * Encode a Stellar address string as a Soroban Address ScVal.
 */
export function encodeAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

/**
 * Encode a bigint as an i128 ScVal.
 */
export function encodeI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

/**
 * Encode a boolean as a bool ScVal.
 */
export function encodeBool(value: boolean): xdr.ScVal {
  return xdr.ScVal.scvBool(value);
}

/**
 * Encode a u32 as a uint32 ScVal.
 */
export function encodeU32(value: number): xdr.ScVal {
  return xdr.ScVal.scvU32(value);
}

/**
 * Decode a Bytes ScVal to a hex string.
 */
export function decodeBytes32(val: xdr.ScVal): string {
  const bytes = val.bytes();
  return Buffer.from(bytes).toString("hex");
}

/**
 * Decode an Address ScVal to a Stellar address string.
 */
export function decodeAddress(val: xdr.ScVal): string {
  return Address.fromScVal(val).toString();
}

/**
 * Decode an i128 ScVal to bigint.
 * Uses scValToNative which returns a BigInt for i128/u128.
 */
export function decodeI128(val: xdr.ScVal): bigint {
  const native = scValToNative(val);
  if (typeof native === "bigint") return native;
  return BigInt(String(native));
}

/**
 * Decode a u64 ScVal to bigint.
 */
export function decodeU64(val: xdr.ScVal): bigint {
  const native = scValToNative(val);
  if (typeof native === "bigint") return native;
  return BigInt(String(native));
}

/**
 * Decode a bool ScVal.
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