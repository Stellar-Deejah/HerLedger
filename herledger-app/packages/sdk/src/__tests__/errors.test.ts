import { describe, it, expect } from "vitest";
import {
  WalletError,
  WalletErrorCode,
  RpcError,
  RpcErrorCode,
  ContractError,
  ContractErrorCode,
  ValidationError,
  ValidationErrorCode,
  AuthenticationError,
  AuthenticationErrorCode,
  assertUnreachable,
  type AppError,
} from "../errors/index.js";

describe("WalletError", () => {
  it("carries a code, message, context, and cause", () => {
    const cause = new Error("underlying");
    const err = new WalletError(WalletErrorCode.ACCESS_DENIED, "Freighter access denied", {
      context: { reason: "User declined access" },
      cause,
    });

    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(WalletError);
    expect(err.name).toBe("WalletError");
    expect(err.kind).toBe("WalletError");
    expect(err.code).toBe("ACCESS_DENIED");
    expect(err.message).toBe("Freighter access denied");
    expect(err.context).toEqual({ reason: "User declined access" });
    expect(err.cause).toBe(cause);
  });

  it("allows omitting options", () => {
    const err = new WalletError(WalletErrorCode.NOT_INSTALLED, "not installed");
    expect(err.context).toBeUndefined();
    expect(err.cause).toBeUndefined();
  });
});

describe("RpcError", () => {
  it("carries a TIMEOUT code with timeout context", () => {
    const err = new RpcError(RpcErrorCode.TIMEOUT, "RPC call timed out after 30000ms", {
      context: { timeoutMs: 30_000 },
    });
    expect(err.code).toBe("TIMEOUT");
    expect(err.context?.timeoutMs).toBe(30_000);
  });

  it("supports every documented RpcErrorCode value", () => {
    const codes: RpcErrorCode[] = [
      RpcErrorCode.REQUEST_FAILED,
      RpcErrorCode.TIMEOUT,
      RpcErrorCode.ALL_ENDPOINTS_UNAVAILABLE,
      RpcErrorCode.NO_ENDPOINTS_CONFIGURED,
      RpcErrorCode.TRANSACTION_NOT_CONFIRMED,
    ];
    for (const code of codes) {
      const err = new RpcError(code, `message for ${code}`);
      expect(err.code).toBe(code);
    }
  });
});

describe("ContractError", () => {
  it("carries a contractCode and method in context", () => {
    const err = new ContractError(ContractErrorCode.SIMULATION_ERROR, "get_business error: boom", {
      context: { contractCode: "boom", method: "get_business" },
    });
    expect(err.code).toBe("SIMULATION_ERROR");
    expect(err.context).toEqual({ contractCode: "boom", method: "get_business" });
  });
});

describe("ValidationError", () => {
  it("carries field/value context", () => {
    const err = new ValidationError(ValidationErrorCode.ADDRESS_MISMATCH, "mismatch", {
      context: { field: "BusinessRegistry", value: "Cxxxx" },
    });
    expect(err.code).toBe("ADDRESS_MISMATCH");
    expect(err.context?.field).toBe("BusinessRegistry");
  });
});

describe("AuthenticationError", () => {
  it("carries a principal in context", () => {
    const err = new AuthenticationError(AuthenticationErrorCode.UNAUTHENTICATED, "no session", {
      context: { principal: "GABC..." },
    });
    expect(err.code).toBe("UNAUTHENTICATED");
    expect(err.context?.principal).toBe("GABC...");
  });
});

// ---------------------------------------------------------------------------
// Exhaustiveness: this function must compile. If a new AppError subtype (or
// a new `.kind` value) is added without a matching `case`, `assertUnreachable`
// makes the `default` branch's argument type-error at compile time.
// ---------------------------------------------------------------------------
function describeError(error: AppError): string {
  switch (error.kind) {
    case "WalletError":
      return `wallet:${error.code}`;
    case "RpcError":
      return `rpc:${error.code}`;
    case "ContractError":
      return `contract:${error.code}`;
    case "ValidationError":
      return `validation:${error.code}`;
    case "AuthenticationError":
      return `auth:${error.code}`;
    default:
      return assertUnreachable(error);
  }
}

describe("exhaustiveness (type-level + runtime)", () => {
  it("discriminates every AppError kind via describeError", () => {
    expect(describeError(new WalletError(WalletErrorCode.NOT_INSTALLED, "x"))).toBe(
      "wallet:NOT_INSTALLED"
    );
    expect(describeError(new RpcError(RpcErrorCode.TIMEOUT, "x"))).toBe("rpc:TIMEOUT");
    expect(
      describeError(new ContractError(ContractErrorCode.DECODE_ERROR, "x"))
    ).toBe("contract:DECODE_ERROR");
    expect(
      describeError(new ValidationError(ValidationErrorCode.MALFORMED_INPUT, "x"))
    ).toBe("validation:MALFORMED_INPUT");
    expect(
      describeError(new AuthenticationError(AuthenticationErrorCode.FORBIDDEN, "x"))
    ).toBe("auth:FORBIDDEN");
  });
});
