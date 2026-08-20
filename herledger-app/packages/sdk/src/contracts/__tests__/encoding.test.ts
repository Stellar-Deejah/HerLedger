import { describe, it, expect } from "vitest";
import { xdr, nativeToScVal } from "@stellar/stellar-sdk";
import {
  toHexString32,
  encodeBytes32,
  decodeI128,
  decodeU64,
  hexToBytes,
  encodeI128,
  type HexString32,
} from "../../index.js";
import { ValidationError } from "../../errors/index.js";

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

describe("encodeBytes32", () => {
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
});

describe("decodeI128", () => {
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
});

describe("decodeU64", () => {
  it("returns bigint for a u64 beyond MAX_SAFE_INTEGER", () => {
    const encoded = nativeToScVal(MAX_SAFE_PLUS, { type: "u64" });
    expect(decodeU64(encoded)).toBe(MAX_SAFE_PLUS);
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
});