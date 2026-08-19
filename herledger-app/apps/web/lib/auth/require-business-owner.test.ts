import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/db/client", () => ({
  getPrismaClient: vi.fn(),
}));

import { requireBusinessOwner } from "./require-business-owner";

const owner = { user: { id: "owner-1" } };
const dbWith = (businessId: string | null) => ({
  businessProfile: { findUnique: async () => (businessId ? { businessId } : null) },
});

describe("requireBusinessOwner", () => {
  it("allows the owner", async () => {
    await expect(requireBusinessOwner(owner, "business-1", dbWith("business-1"))).resolves.toEqual({
      ok: true,
      businessId: "business-1",
    });
  });

  it("rejects a non-owner", async () => {
    await expect(requireBusinessOwner(owner, "business-2", dbWith("business-1"))).resolves.toMatchObject({
      ok: false,
      status: 403,
      code: "FORBIDDEN",
    });
  });

  it("rejects an unauthenticated request", async () => {
    await expect(requireBusinessOwner(null, "business-1", dbWith("business-1"))).resolves.toMatchObject({
      ok: false,
      status: 401,
      code: "UNAUTHORIZED",
    });
  });
});
