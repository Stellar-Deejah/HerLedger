/* eslint-disable @typescript-eslint/no-explicit-any */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DELETE } from "./route";
import { auth } from "@/lib/auth/server";
import { createMockDbClient, resetDbClient, setDbClient } from "@herledger/db";

vi.mock("server-only", () => ({}));
vi.mock("@herledger/config", () => ({
  getServerEnv: vi.fn(() => ({ DATABASE_URL: "mock" })),
}));
vi.mock("@herledger/config/server", () => ({
  getServerEnv: vi.fn(() => ({ DATABASE_URL: "mock" })),
}));
vi.mock("@/lib/auth/server", () => {
  return {
    auth: {
      api: {
        getSession: vi.fn(),
        signInEmail: vi.fn(),
      },
    },
  };
});

describe("DELETE /api/user/account", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetDbClient();
  });

  it("should fail if unauthorized", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce(null);
    const mockDb = createMockDbClient();
    setDbClient(mockDb);
    const req = new Request("http://localhost/api/user/account");
    const res = await DELETE(req);
    expect(res.status).toBe(401);
  });

  it("should fail if password is wrong", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce({
      user: { id: "user_1", email: "test@example.com" },
    });
    (auth.api.signInEmail as any).mockRejectedValueOnce(new Error("Invalid password"));
    const mockDb = createMockDbClient();
    setDbClient(mockDb);

    const req = new Request("http://localhost/api/user/account", {
      method: "DELETE",
      body: JSON.stringify({ password: "wrong" }),
    });
    const res = await DELETE(req);

    expect(res.status).toBe(401);
    expect(auth.api.signInEmail).toHaveBeenCalledWith({
      body: { email: "test@example.com", password: "wrong" },
    });
  });

  it("should soft-delete user, revoke sessions, and anonymize wallet", async () => {
    (auth.api.getSession as any).mockResolvedValueOnce({
      user: { id: "user_1", email: "test@example.com" },
    });
    (auth.api.signInEmail as any).mockResolvedValueOnce({});
    const mockDb = createMockDbClient();
    setDbClient(mockDb);

    const req = new Request("http://localhost/api/user/account", {
      method: "DELETE",
      body: JSON.stringify({ password: "correct" }),
    });

    const res = await DELETE(req);
    expect(res.status).toBe(200);

    // Verify repository deleteAccount was called
    expect(mockDb.users.deleteAccount).toHaveBeenCalledWith("user_1");
  });
});
