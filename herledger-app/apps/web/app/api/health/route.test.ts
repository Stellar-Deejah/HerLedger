import { checkRpcHealth } from "@herledger/sdk";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET } from "./route";

vi.mock("server-only", () => ({}));
vi.mock("@herledger/config/server", () => ({
  getStellarNetworkConfig: vi.fn(() => ({ network: "testnet" })),
}));
vi.mock("@herledger/sdk", () => ({
  checkRpcHealth: vi.fn(),
}));

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
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.status).toBe("ok");
    expect(body.data.rpc.healthy).toBe(true);
    expect(body.data.rpc.latestLedger).toBe(12345);
    expect(body.error).toBeNull();
  });

  it("returns status degraded when the RPC is unhealthy", async () => {
    vi.mocked(checkRpcHealth).mockResolvedValueOnce({
      healthy: false,
      activeEndpoint: null,
      error: "RPC unreachable",
      endpoints: [],
    });

    const res = await GET();
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.data.status).toBe("degraded");
    expect(body.data.rpc.healthy).toBe(false);
    expect(body.data.rpc.error).toBe("RPC unreachable");
    expect(body.error).toBeNull();
  });
});
