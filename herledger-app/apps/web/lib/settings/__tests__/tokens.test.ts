import { describe, it, expect, vi } from "vitest";
import {
  createPersonalAccessToken,
  listPersonalAccessTokens,
  revokePersonalAccessToken,
} from "../tokens";

const PEPPER = "test-pepper-value-not-a-real-secret-32chars";

function makeFakePrisma(initialTokens: Array<Record<string, unknown>> = []) {
  const tokens = [...initialTokens];
  let idCounter = 0;

  return {
    __tokens: tokens,
    personalAccessToken: {
      create: vi.fn(async ({ data }: { data: Record<string, unknown> }) => {
        idCounter += 1;
        const record = {
          id: `pat_${idCounter}`,
          createdAt: new Date(),
          lastUsedAt: null,
          revokedAt: null,
          ...data,
        };
        tokens.push(record);
        return record;
      }),
      findMany: vi.fn(async ({ where }: { where: { userId: string } }) => {
        return tokens
          .filter((t) => t["userId"] === where.userId)
          .sort((a, b) => (b["createdAt"] as Date).getTime() - (a["createdAt"] as Date).getTime())
          .map((t) => ({
            id: t["id"],
            name: t["name"],
            prefix: t["prefix"],
            createdAt: t["createdAt"],
            lastUsedAt: t["lastUsedAt"],
            revokedAt: t["revokedAt"],
          }));
      }),
      updateMany: vi.fn(
        async ({
          where,
          data,
        }: {
          where: { id: string; userId: string; revokedAt: null };
          data: Record<string, unknown>;
        }) => {
          const matches = tokens.filter(
            (t) => t["id"] === where.id && t["userId"] === where.userId && t["revokedAt"] === null
          );
          for (const match of matches) Object.assign(match, data);
          return { count: matches.length };
        }
      ),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } as any;
}

describe("createPersonalAccessToken", () => {
  it("returns the plaintext token exactly once, alongside its metadata", async () => {
    const prisma = makeFakePrisma();
    const result = await createPersonalAccessToken(prisma, "user_1", "QuickBooks sync", PEPPER);

    expect(result.token.startsWith("hl_pat_")).toBe(true);
    expect(result.name).toBe("QuickBooks sync");
    expect(result.prefix).toBeTruthy();
    expect(result.revokedAt).toBeNull();
  });

  it("never persists the plaintext token — only its hash", async () => {
    const prisma = makeFakePrisma();
    const result = await createPersonalAccessToken(prisma, "user_1", "QuickBooks sync", PEPPER);

    const stored = prisma.__tokens[0];
    expect(stored.tokenHash).toBeDefined();
    expect(stored.tokenHash).not.toBe(result.token);
    expect(String(stored.tokenHash)).toMatch(/^[0-9a-f]{64}$/);
  });

  it("scopes the created token to the requesting user", async () => {
    const prisma = makeFakePrisma();
    await createPersonalAccessToken(prisma, "user_42", "token", PEPPER);
    expect(prisma.__tokens[0].userId).toBe("user_42");
  });
});

describe("listPersonalAccessTokens", () => {
  it("never includes the token hash in listed results", async () => {
    const prisma = makeFakePrisma();
    await createPersonalAccessToken(prisma, "user_1", "token A", PEPPER);

    const list = await listPersonalAccessTokens(prisma, "user_1");

    expect(list).toHaveLength(1);
    expect(list[0]).not.toHaveProperty("tokenHash");
  });

  it("only returns tokens belonging to the requesting user", async () => {
    const prisma = makeFakePrisma();
    await createPersonalAccessToken(prisma, "user_1", "mine", PEPPER);
    await createPersonalAccessToken(prisma, "user_2", "not mine", PEPPER);

    const list = await listPersonalAccessTokens(prisma, "user_1");

    expect(list).toHaveLength(1);
    expect(list[0]?.name).toBe("mine");
  });
});

describe("token revocation", () => {
  it("revokes a token owned by the requesting user", async () => {
    const prisma = makeFakePrisma();
    const created = await createPersonalAccessToken(prisma, "user_1", "token", PEPPER);

    const result = await revokePersonalAccessToken(prisma, "user_1", created.id);

    expect(result.revoked).toBe(true);
    expect(prisma.__tokens[0].revokedAt).not.toBeNull();
  });

  it("does not revoke a token belonging to a different user", async () => {
    const prisma = makeFakePrisma();
    const created = await createPersonalAccessToken(prisma, "user_1", "token", PEPPER);

    const result = await revokePersonalAccessToken(prisma, "someone_else", created.id);

    expect(result.revoked).toBe(false);
    expect(prisma.__tokens[0].revokedAt).toBeNull();
  });

  it("is idempotent — revoking an already-revoked token reports revoked: false", async () => {
    const prisma = makeFakePrisma();
    const created = await createPersonalAccessToken(prisma, "user_1", "token", PEPPER);

    const first = await revokePersonalAccessToken(prisma, "user_1", created.id);
    const second = await revokePersonalAccessToken(prisma, "user_1", created.id);

    expect(first.revoked).toBe(true);
    expect(second.revoked).toBe(false);
  });

  it("reports revoked: false for a non-existent token id", async () => {
    const prisma = makeFakePrisma();
    const result = await revokePersonalAccessToken(prisma, "user_1", "does-not-exist");
    expect(result.revoked).toBe(false);
  });
});
