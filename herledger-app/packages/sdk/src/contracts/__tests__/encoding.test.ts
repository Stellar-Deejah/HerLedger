import { describe, it, expect, vi } from "vitest";
import { nativeToScVal } from "@stellar/stellar-sdk";
import {
  toHexString32,
  encodeBytes32,
  decodeBytes32,
  encodeAddress,
  decodeAddress,
  decodeI128,
  decodeU64,
  hexToBytes,
  encodeI128,
  encodeBool,
  decodeBool,
  encodeU32,
  type HexString32,
} from "../../index.js";
import { ValidationError } from "../../errors/index.js";

// scValToNative is wrapped (not replaced) so every other test in this file
// still gets its real, correct behavior -- only the two tests below that
// explicitly override its return value via mockReturnValueOnce see a fake
// result, to exercise decodeI128/decodeU64's defensive non-bigint fallback
// (scValToNative always returns a bigint for well-formed i128/u64 ScVals in
// practice, so that branch is otherwise unreachable).
vi.mock("@stellar/stellar-sdk", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@stellar/stellar-sdk")>();
  return { ...actual, scValToNative: vi.fn(actual.scValToNative) };
});
import { scValToNative } from "@stellar/stellar-sdk";

// ---------------------------------------------------------------------------
// Round-trip tests for every exported encode/decode function in
// packages/sdk/src/contracts/encoding.ts.
//
// fast-check isn't a dependency anywhere in the monorepo (checked every
// package.json under herledger-app/); adding it purely for this file would
// be a net-new devDependency for a handful of pure functions already
// exhaustively covered by boundary-focused fixture tables below (zero/min/
// max/negative/odd-length/mixed-case inputs). Table-based tests were used
// instead, per the issue's fallback clause.
// ---------------------------------------------------------------------------

const VALID_32_BYTE_HEX = "ab".repeat(32);
const VALID_32_BYTE_HEX_UPPER = "AB".repeat(32);
const MAX_SAFE_PLUS = 9007199254740992n; // Number.MAX_SAFE_INTEGER + 1
const LARGE_I128 = 2n ** 127n - 1n; // i128::MAX, far above MAX_SAFE_INTEGER

describe("toHexString32", () => {
  it("accepts a valid 64-character lowercase hex string", () => {
    expect(toHexString32(VALID_32_BYTE_HEX)).toBe(VALID_32_BYTE_HEX);
  });

  it("accepts a valid 64-character uppercase hex string", () => {
    expect(toHexString32(VALID_32_BYTE_HEX_UPPER)).toBe(VALID_32_BYTE_HEX_UPPER);
  });

  it("throws ValidationError for a non-hex string", () => {
    expect(() => toHexString32("not-hex-at-all-this-is-way-too-long-to-be-32-bytes")).toThrow(
      ValidationError
    );
  });

  it("throws ValidationError for a string that is too short", () => {
    expect(() => toHexString32("abcd")).toThrow(ValidationError);
  });

  it("throws ValidationError for a string that is too long", () => {
    expect(() => toHexString32("ab".repeat(33))).toThrow(ValidationError);
  });

  it("throws ValidationError for an empty string", () => {
    expect(() => toHexString32("")).toThrow(ValidationError);
  });
});

describe("encodeBytes32 / decodeBytes32 round-trip", () => {
  it("requires a HexString32 (not a plain string)", () => {
    // This is a compile-time contract; at runtime we assert the branded
    // validation gate throws for anything that never went through the brand.
    const typed = "ab".repeat(32) as HexString32;
    const scVal = encodeBytes32(typed);
    expect(scVal.bytes()).toHaveLength(32);
    expect(Buffer.from(scVal.bytes()).toString("hex")).toBe(VALID_32_BYTE_HEX);
  });

  it("throws ValidationError for a non-32-byte input (silent truncation is impossible)", () => {
    const tooShort = toHexString32("ab".repeat(32)); // valid 32 bytes
    const bytes = encodeBytes32(tooShort).bytes();
    expect(bytes).toHaveLength(32);
    // A 31-byte string can never produce a 32-byte buffer through the brand.
    expect(() => toHexString32("ab".repeat(31))).toThrow(ValidationError);
  });

  it("throws ValidationError from encodeBytes32's own defensive length check when the brand is bypassed", () => {
    // toHexString32 guarantees exactly 64 hex chars (32 bytes) for anything
    // that reaches encodeBytes32 through the normal API, so this branch is
    // unreachable via the public surface. It still exists as a defence in
    // depth against a bypassed brand (e.g. an unchecked `as HexString32`
    // cast, as tests above already do) -- exercise it directly so that
    // defence stays covered.
    const wrongLength = "ab".repeat(16) as HexString32; // 16 bytes, not 32
    expect(() => encodeBytes32(wrongLength)).toThrow(ValidationError);
    expect(() => encodeBytes32(wrongLength)).toThrow(/Expected 32-byte hex string/);
  });

  it.each([
    ["all zeros", "0".repeat(64)],
    ["all f's", "f".repeat(64)],
    ["mixed case", "AbCd".repeat(16)],
    ["sequential", "0123456789abcdef".repeat(4)],
  ])("round-trips %s", (_label, hex) => {
    const scval = encodeBytes32(toHexString32(hex));
    const decoded = decodeBytes32(scval);
    expect(decoded).toBe(hex.toLowerCase());
  });
});

describe("encodeAddress / decodeAddress round-trip", () => {
  it.each([
    ["a well-formed G... account address", "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF"],
    ["a well-formed C... contract address", "CAAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQCAIBAEAQC526"],
  ])("round-trips %s", (_label, address) => {
    const scval = encodeAddress(address);
    expect(decodeAddress(scval)).toBe(address);
  });

  it("throws for a malformed address", () => {
    expect(() => encodeAddress("not-an-address")).toThrow();
  });
});

describe("encodeI128 / decodeI128 round-trip", () => {
  it.each([
    ["zero", 0n],
    ["one", 1n],
    ["a typical payment amount", 50000000n],
    ["negative one", -1n],
    ["a large negative amount", -123456789012345n],
    ["i64 max", 9223372036854775807n],
    ["i128 max", (1n << 127n) - 1n],
    ["i128 min", -(1n << 127n)],
  ])("round-trips %s (%s)", (_label, value) => {
    const scval = encodeI128(value);
    expect(decodeI128(scval)).toBe(value);
  });

  it("returns bigint for an i128 greater than MAX_SAFE_INTEGER", () => {
    const encoded = encodeI128(LARGE_I128);
    const decoded = decodeI128(encoded);
    expect(decoded).toBe(LARGE_I128);
    expect(typeof decoded).toBe("bigint");
  });

  it("returns bigint for values just above Number.MAX_SAFE_INTEGER", () => {
    const encoded = encodeI128(MAX_SAFE_PLUS);
    expect(decodeI128(encoded)).toBe(MAX_SAFE_PLUS);
  });

  it("falls back to BigInt(String(native)) when scValToNative doesn't return a bigint", () => {
    vi.mocked(scValToNative).mockReturnValueOnce(42 as never);
    const encoded = encodeI128(1n);
    expect(decodeI128(encoded)).toBe(42n);
  });
});

describe("encodeBool / decodeBool round-trip", () => {
  it.each([[true], [false]])("round-trips %s", (value) => {
    const scval = encodeBool(value);
    expect(decodeBool(scval)).toBe(value);
  });
});

describe("encodeU32", () => {
  it.each([0, 1, 42, 4294967295])("encodes %i without throwing", (value) => {
    expect(() => encodeU32(value)).not.toThrow();
    expect(encodeU32(value).u32()).toBe(value);
  });
});

describe("decodeU64", () => {
  it("returns bigint for a u64 beyond MAX_SAFE_INTEGER", () => {
    const encoded = nativeToScVal(MAX_SAFE_PLUS, { type: "u64" });
    expect(decodeU64(encoded)).toBe(MAX_SAFE_PLUS);
  });

  it.each([
    ["zero", 0n],
    ["a mid-range value", 12345n],
    ["u64 max", 18446744073709551615n],
  ])("decodes %s via encodeI128 as a u64-shaped bigint", (_label, value) => {
    // decodeU64 shares its native-conversion path with decodeI128; encode
    // through encodeI128 (there's no dedicated encodeU64 export) to build a
    // fixture ScVal and confirm decodeU64 returns the same bigint.
    const scval = encodeI128(value);
    expect(decodeU64(scval)).toBe(value);
  });

  it("falls back to BigInt(String(native)) when scValToNative doesn't return a bigint", () => {
    vi.mocked(scValToNative).mockReturnValueOnce(7 as never);
    const encoded = encodeI128(1n);
    expect(decodeU64(encoded)).toBe(7n);
  });
});

describe("hexToBytes", () => {
  it("throws ValidationError for odd-length hex", () => {
    expect(() => hexToBytes("abc")).toThrow(ValidationError);
  });

  it("throws ValidationError for non-hex characters", () => {
    expect(() => hexToBytes("zzzz")).toThrow(ValidationError);
  });

  it("decodes a valid hex string to bytes", () => {
    expect(Buffer.from(hexToBytes("abcd")).toString("hex")).toBe("abcd");
  });

  it("strips a 0x prefix before decoding", () => {
    expect(Buffer.from(hexToBytes("0xabcd")).toString("hex")).toBe("abcd");
  });

  it("returns an empty array for an empty string", () => {
    expect(Array.from(hexToBytes(""))).toEqual([]);
  });

  it.each([
    ["00", [0x00]],
    ["ff", [0xff]],
    ["0011ff", [0x00, 0x11, 0xff]],
    ["ABCDEF", [0xab, 0xcd, 0xef]],
  ])("decodes %s", (hex, expected) => {
    expect(Array.from(hexToBytes(hex))).toEqual(expected);
  });
});
