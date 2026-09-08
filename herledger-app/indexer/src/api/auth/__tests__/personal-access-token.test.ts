import { describe, it, expect, vi } from "vitest";
import { hashPersonalAccessToken } from "@herledger/config/tokens";
import { extractBearerToken, verifyPersonalAccessToken } from "../personal-access-token.js";

const PEPPER = "test-pepper-value-not-a-real-secret-32chars";

function makeFakePrisma(tokens: Array<Record<string, unknown>>) {
  return {
    personalAccessToken: {
      findUnique: vi.fn(async ({ where }: { where: { tokenHash: string } }) => {
        return tokens.find((t) => t["tokenHash"] === where.tokenHash) ?? null;
      }),
      update: vi.fn(
        async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
          const record = tokens.find((t) => t["id"] === where.id);
          if (!record) throw new Error("not found");
          Object.assign(record, data);
          return record;
        }
      ),
    },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("extractBearerToken", () => {
  it("extracts the token from a well-formed Bearer header", () => {
    expect(extractBearerToken("Bearer hl_pat_abc123")).toBe("hl_pat_abc123");
  });

  it("returns null when the header is missing", () => {
    expect(extractBearerToken(undefined)).toBeNull();
  });

  it("returns null for a non-Bearer scheme", () => {
    expect(extractBearerToken("Basic dXNlcjpwYXNz")).toBeNull();
  });

  it("returns null for an empty token after the scheme", () => {
    expect(extractBearerToken("Bearer ")).toBeNull();
    expect(extractBearerToken("Bearer    ")).toBeNull();
  });
});

describe("verifyPersonalAccessToken", () => {
  it("authenticates a valid, non-revoked token", async () => {
    const rawToken = "hl_pat_validtoken";
    const tokenHash = hashPersonalAccessToken(rawToken, PEPPER);
    const prisma = makeFakePrisma([{ id: "pat_1", userId: "user_1", tokenHash, revokedAt: null }]);

    const result = await verifyPersonalAccessToken(prisma, rawToken, PEPPER);

    expect(result).toEqual({ tokenId: "pat_1", userId: "user_1" });
  });

  it("records lastUsedAt on successful authentication", async () => {
    const rawToken = "hl_pat_validtoken";
    const tokenHash = hashPersonalAccessToken(rawToken, PEPPER);
    const prisma = makeFakePrisma([{ id: "pat_1", userId: "user_1", tokenHash, revokedAt: null }]);

    await verifyPersonalAccessToken(prisma, rawToken, PEPPER);
    // The update is fire-and-forget; flush microtasks before asserting.
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(prisma.personalAccessToken.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "pat_1" } })
    );
  });

  it("rejects an unrecognized token", async () => {
    const prisma = makeFakePrisma([]);
    const result = await verifyPersonalAccessToken(prisma, "hl_pat_unknown", PEPPER);
    expect(result).toBeNull();
  });

  it("rejects a revoked token", async () => {
    const rawToken = "hl_pat_revokedtoken";
    const tokenHash = hashPersonalAccessToken(rawToken, PEPPER);
    const prisma = makeFakePrisma([
      { id: "pat_2", userId: "user_2", tokenHash, revokedAt: new Date() },
    ]);

    const result = await verifyPersonalAccessToken(prisma, rawToken, PEPPER);
    expect(result).toBeNull();
  });

  it("rejects a token hashed under a different pepper", async () => {
    const rawToken = "hl_pat_validtoken";
    const tokenHash = hashPersonalAccessToken(rawToken, "a-completely-different-pepper-32-chars");
    const prisma = makeFakePrisma([{ id: "pat_3", userId: "user_3", tokenHash, revokedAt: null }]);

    const result = await verifyPersonalAccessToken(prisma, rawToken, PEPPER);
    expect(result).toBeNull();
  });
});
