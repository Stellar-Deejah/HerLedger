import { describe, it, expect, vi, beforeEach } from "vitest";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@herledger/config/server", () => ({
  getStellarNetworkConfig: vi.fn(() => ({ network: "testnet" })),
}));
vi.mock("@herledger/sdk", () => ({
  checkRpcHealth: vi.fn(),
}));

import { checkRpcHealth } from "@herledger/sdk";

describe("GET /api/health", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns status ok when the RPC is healthy", async () => {
    vi.mocked(checkRpcHealth).mockResolvedValueOnce({
      healthy: true,
      activeEndpoint: "https://soroban-testnet.stellar.org",
      latestLedger: 12345,
      endpoints: [],
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("ok");
    expect(body.data.rpc.healthy).toBe(true);
  });

  it("returns status degraded when the RPC is unhealthy", async () => {
    vi.mocked(checkRpcHealth).mockResolvedValueOnce({
      healthy: false,
      activeEndpoint: null,
      error: "all endpoints down",
      endpoints: [],
    } as never);

    const res = await GET();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.status).toBe("degraded");
    expect(body.data.rpc.healthy).toBe(false);
    expect(body.data.rpc.error).toBe("all endpoints down");
  });
});
