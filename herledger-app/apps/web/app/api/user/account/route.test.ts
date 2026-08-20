import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "./route";
import { auth } from "@/lib/auth/server";

vi.mock("server-only", () => ({}));
vi.mock("@herledger/config", () => ({
  getServerEnv: vi.fn(() => ({ DATABASE_URL: "mock" }))
}));
vi.mock("@herledger/config/server", () => ({
  getServerEnv: vi.fn(() => ({ DATABASE_URL: "mock" }))
}));
vi.mock("@/lib/auth/server", () => {
  return {
    auth: {
      api: {
        getSession: vi.fn(),
        signInEmail: vi.fn(),
      }
    }
  };
});

const { mockPrisma } = vi.hoisted(() => {
  const mockPrisma = {
    $transaction: vi.fn(async (cb) => cb(mockPrisma)),
    session: { deleteMany: vi.fn() },
    user: { update: vi.fn() },
    businessProfile: { findUnique: vi.fn(), update: vi.fn() },
  };
  return { mockPrisma };
});

vi.mock("@prisma/client", () => {
  return {
    PrismaClient: class {
      constructor() {
        return mockPrisma;
      }
    },
  };
});

describe("DELETE /api/user/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should fail if unauthorized", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const req = new Request("http://localhost/api/user/account");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("should fail if password is wrong", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce({ user: { id: "user_1", email: "test@example.com" } });
    (auth.api.signInEmail as any).mockRejectedValueOnce(new Error("Invalid password"));
    
    const req = new Request("http://localhost/api/user/account", {
      method: "DELETE",
      body: JSON.stringify({ password: "wrong" })
    });
    const res = await DELETE(req);
    
    expect(res.status).toBe(401);
    expect(auth.api.signInEmail).toHaveBeenCalledWith({ body: { email: "test@example.com", password: "wrong" } });
  });

  it("should soft-delete user, revoke sessions, and anonymize wallet", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce({ user: { id: "user_1", email: "test@example.com" } });
    (auth.api.signInEmail as any).mockResolvedValueOnce({});
    
    mockPrisma.businessProfile.findUnique.mockResolvedValueOnce({
      id: "profile_1",
      walletAddress: "GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHI"
    });

    const req = new Request("http://localhost/api/user/account", {
      method: "DELETE",
      body: JSON.stringify({ password: "correct" })
    });
    
    const res = await DELETE(req);
    expect(res.status).toBe(200);

    // Verify session revocation
    expect(mockPrisma.session.deleteMany).toHaveBeenCalledWith({
      where: { userId: "user_1" }
    });

    // Verify user soft-delete
    expect(mockPrisma.user.update).toHaveBeenCalledWith({
      where: { id: "user_1" },
      data: { deletedAt: expect.any(Date) }
    });

    // Verify wallet anonymization
    expect(mockPrisma.businessProfile.update).toHaveBeenCalledWith({
      where: { id: "profile_1" },
      data: { walletAddress: expect.any(String) }
    });
    
    // Ensure the wallet was actually hashed and not just stored plain text
    const updateCall = mockPrisma.businessProfile.update.mock.calls[0][0];
    expect(updateCall.data.walletAddress).not.toBe("GABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHIJKLMNOPQRSTUVWXYZABCDEFGHI");
    expect(updateCall.data.walletAddress.length).toBe(64); // SHA-256 hex length
  });
});
