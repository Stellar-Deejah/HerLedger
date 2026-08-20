import { describe, it, expect, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { z } from "zod";
import { StrKey } from "@stellar/stellar-sdk";
import { validateNetworkConsistency } from "../server.js";

const MAINNET_PASSPHRASE = "Public Global Stellar Network ; September 2015";
const TESTNET_PASSPHRASE = "Test SDF Network ; September 2015";

// A real, valid-format testnet contract address for testing the regex/checksum path.
const VALID_CONTRACT_ID = StrKey.encodeContract(Buffer.alloc(32));

const stellarContractId = z.string().refine((val) => StrKey.isValidContract(val), {
  message: "Must be a valid Stellar contract address (56-char C... strkey)",
});

describe("validateNetworkConsistency", () => {
  it("passes for valid mainnet combination", () => {
    expect(() =>
      validateNetworkConsistency("mainnet", "https://mainnet.rpc.example.com", MAINNET_PASSPHRASE)
    ).not.toThrow();
  });

  it("passes for valid testnet combination", () => {
    expect(() =>
      validateNetworkConsistency("testnet", "https://testnet.rpc.example.com", TESTNET_PASSPHRASE)
    ).not.toThrow();
  });

  it("throws when mainnet network has testnet passphrase", () => {
    expect(() =>
      validateNetworkConsistency("mainnet", "https://mainnet.rpc.example.com", TESTNET_PASSPHRASE)
    ).toThrow(/Network consistency check failed/);
  });

  it("throws when testnet network has mainnet passphrase", () => {
    expect(() =>
      validateNetworkConsistency("testnet", "https://testnet.rpc.example.com", MAINNET_PASSPHRASE)
    ).toThrow(/Network consistency check failed/);
  });

  it("throws when mainnet network points at a testnet-labelled RPC URL", () => {
    expect(() =>
      validateNetworkConsistency("mainnet", "https://testnet.rpc.example.com", MAINNET_PASSPHRASE)
    ).toThrow(/looks like a testnet URL/);
  });

  it("throws when testnet network points at a mainnet-labelled RPC URL", () => {
    expect(() =>
      validateNetworkConsistency("testnet", "https://mainnet.rpc.example.com", TESTNET_PASSPHRASE)
    ).toThrow(/looks like a mainnet URL/);
  });

  it("rejects an empty passphrase", () => {
    expect(() => validateNetworkConsistency("mainnet", "https://rpc.example.com", "")).toThrow();
  });
});

describe("contract ID format validation", () => {
  it("accepts a well-formed Stellar contract address", () => {
    const result = stellarContractId.safeParse(VALID_CONTRACT_ID);
    expect(result.success).toBe(true);
  });

  it("rejects a truncated contract ID", () => {
    const result = stellarContractId.safeParse("CAAAAAAAAAAAAAAAAAAAAAAAAAAA");
    expect(result.success).toBe(false);
  });

  it("rejects a contract ID with an invalid checksum", () => {
    const tampered = "C" + "A".repeat(54) + "X";
    const result = stellarContractId.safeParse(tampered);
    expect(result.success).toBe(false);
  });

  it("rejects a non-contract Stellar address (G... account address)", () => {
    const result = stellarContractId.safeParse(
      "GA7QYNF7SOWQ3GLR2BGMZEHXAVIRZA4KVWLTJJFC7MGXUA74P7UJVSGZ"
    );
    expect(result.success).toBe(false);
  });

  it("rejects an empty string", () => {
    const result = stellarContractId.safeParse("");
    expect(result.success).toBe(false);
  });

  it("rejects a plain non-Stellar string", () => {
    const result = stellarContractId.safeParse("not-a-contract-id");
    expect(result.success).toBe(false);
  });
});
