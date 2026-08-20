import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getSorobanRpcServer,
  getLatestLedger,
  checkRpcHealth,
  withRpcFailover,
  getActiveRpcEndpoint,
  resetRpcState,
  configureCircuitBreaker,
  recordRpcFailure,
  parseRpcUrls,
} from "../rpc/client.js";
import type { StellarNetworkConfig } from "../types/index.js";

// Setup global mock variables for the class methods
const mockGetLatestLedger = vi.fn();
const mockSimulateTransaction = vi.fn();
const mockSendTransaction = vi.fn();
const mockGetTransaction = vi.fn();
const mockGetEvents = vi.fn();

// Mock the Stellar SDK
vi.mock("@stellar/stellar-sdk", () => {
  class MockServer {
    _url: string;
    constructor(url: string) {
      this._url = url;
    }
    getLatestLedger() {
      return mockGetLatestLedger();
    }
    simulateTransaction(tx: unknown) {
      return mockSimulateTransaction(tx);
    }
    sendTransaction(txObj: unknown) {
      return mockSendTransaction(txObj);
    }
    getTransaction(hash: string) {
      return mockGetTransaction(hash);
    }
    getEvents(options: unknown) {
      return mockGetEvents(options);
    }
  }

  return {
    rpc: {
      Server: MockServer,
    },
  };
});

function makeConfig(rpcUrl: string): StellarNetworkConfig {
  return {
    network: "testnet",
    rpcUrl,
    horizonUrl: "https://horizon-testnet.stellar.org",
    networkPassphrase: "Test SDF Network ; September 2015",
  };
}

describe("parseRpcUrls", () => {
  it("parses a single URL", () => {
    const config = makeConfig("https://rpc1.example.com");
    expect(parseRpcUrls(config)).toEqual(["https://rpc1.example.com"]);
  });

  it("parses multiple comma-separated URLs", () => {
    const config = makeConfig(
      "https://rpc1.example.com, https://rpc2.example.com , https://rpc3.example.com"
    );
    expect(parseRpcUrls(config)).toEqual([
      "https://rpc1.example.com",
      "https://rpc2.example.com",
      "https://rpc3.example.com",
    ]);
  });

  it("strips whitespace and empty entries", () => {
    const config = makeConfig("https://rpc1.example.com , , https://rpc2.example.com");
    expect(parseRpcUrls(config)).toEqual([
      "https://rpc1.example.com",
      "https://rpc2.example.com",
    ]);
  });
});

describe("getSorobanRpcServer", () => {
  beforeEach(() => {
    resetRpcState();
    mockGetLatestLedger.mockReset();
    mockSimulateTransaction.mockReset();
    mockSendTransaction.mockReset();
    mockGetTransaction.mockReset();
    mockGetEvents.mockReset();
  });

  it("returns a server instance for a single endpoint", () => {
    const config = makeConfig("https://rpc1.example.com");
    const server = getSorobanRpcServer(config);
    expect(server).toBeDefined();
  });

  it("returns the first available server from multiple endpoints", () => {
    const config = makeConfig("https://rpc1.example.com,https://rpc2.example.com");
    const server = getSorobanRpcServer(config);
    expect(server).toBeDefined();
  });

  it("skips endpoints with open circuit breakers", () => {
    configureCircuitBreaker({ failureThreshold: 1 });
    const config = makeConfig("https://rpc1.example.com,https://rpc2.example.com");

    // Get the first server — it should be rpc1
    const server1 = getSorobanRpcServer(config);
    expect(server1).toBeDefined();

    // Record a failure against the first endpoint to open its circuit
    recordRpcFailure("https://rpc1.example.com");

    // Now the server should fall back to rpc2
    const server2 = getSorobanRpcServer(config);
    expect(server2).toBeDefined();
    // The returned server should be different (rpc2 instead of rpc1)
    expect(server2).not.toBe(server1);
  });

  it("throws when all circuits are open", () => {
    configureCircuitBreaker({ failureThreshold: 1 });
    const config = makeConfig("https://rpc1.example.com,https://rpc2.example.com");

    // Initialize
    getSorobanRpcServer(config);

    // Open both circuits
    recordRpcFailure("https://rpc1.example.com");
    recordRpcFailure("https://rpc2.example.com");

    expect(() => getSorobanRpcServer(config)).toThrow(
      /All RPC endpoints are unavailable/
    );
  });

  it("throws when no URLs are configured", () => {
    const config = makeConfig("");
    expect(() => getSorobanRpcServer(config)).toThrow(/No RPC URLs configured/);
  });
});

describe("getActiveRpcEndpoint", () => {
  beforeEach(() => {
    resetRpcState();
  });

  it("returns the first available endpoint URL", () => {
    const config = makeConfig("https://rpc1.example.com,https://rpc2.example.com");
    expect(getActiveRpcEndpoint(config)).toBe("https://rpc1.example.com");
  });

  it("returns null when all circuits are open", () => {
    configureCircuitBreaker({ failureThreshold: 1 });
    const config = makeConfig("https://rpc1.example.com");
    getSorobanRpcServer(config);
    recordRpcFailure("https://rpc1.example.com");
    expect(getActiveRpcEndpoint(config)).toBeNull();
  });
});

describe("withRpcFailover", () => {
  beforeEach(() => {
    resetRpcState();
    mockGetLatestLedger.mockReset();
  });

  it("returns the result from the first successful endpoint", async () => {
    const config = makeConfig("https://rpc1.example.com");
    const result = await withRpcFailover(config, async () => ({ value: 42 }));
    expect(result).toEqual({ value: 42 });
  });

  it("fails over to the next endpoint on failure", async () => {
    const config = makeConfig("https://rpc1.example.com,https://rpc2.example.com");
    let callCount = 0;

    const result = await withRpcFailover(config, async (_server) => {
      callCount++;
      if (callCount === 1) {
        throw new Error("rpc1 is down");
      }
      return { endpoint: "rpc2", value: 99 };
    });

    expect(callCount).toBe(2);
    expect(result).toEqual({ endpoint: "rpc2", value: 99 });
  });

  it("throws when all endpoints fail", async () => {
    const config = makeConfig("https://rpc1.example.com,https://rpc2.example.com");

    await expect(
      withRpcFailover(config, async () => {
        throw new Error("down");
      })
    ).rejects.toThrow(/All RPC endpoints failed/);
  });
});

describe("checkRpcHealth", () => {
  beforeEach(() => {
    resetRpcState();
    mockGetLatestLedger.mockReset();
  });

  it("returns healthy when getLatestLedger succeeds", async () => {
    const config = makeConfig("https://rpc1.example.com");
    mockGetLatestLedger.mockResolvedValue({ sequence: 12345 });

    const result = await checkRpcHealth(config);
    expect(result.healthy).toBe(true);
    expect(result.latestLedger).toBe(12345);
    expect(result.activeEndpoint).toBe("https://rpc1.example.com");
    expect(result.endpoints).toHaveLength(1);
    expect(result.endpoints[0]?.circuitState).toBe("CLOSED");
  });

  it("returns unhealthy when all endpoints fail", async () => {
    const config = makeConfig("https://rpc1.example.com");
    mockGetLatestLedger.mockRejectedValue(new Error("connection refused"));

    const result = await checkRpcHealth(config);
    expect(result.healthy).toBe(false);
    expect(result.error).toBeDefined();
    expect(result.activeEndpoint).toBeNull();
  });

  it("reports per-endpoint circuit breaker states", async () => {
    const config = makeConfig("https://rpc1.example.com,https://rpc2.example.com");
    mockGetLatestLedger.mockResolvedValue({ sequence: 100 });

    const result = await checkRpcHealth(config);
    expect(result.endpoints).toHaveLength(2);
    expect(result.endpoints[0]?.url).toBe("https://rpc1.example.com");
    expect(result.endpoints[1]?.url).toBe("https://rpc2.example.com");
  });
});

describe("getLatestLedger", () => {
  beforeEach(() => {
    resetRpcState();
    mockGetLatestLedger.mockReset();
  });

  it("returns the ledger sequence on success", async () => {
    const config = makeConfig("https://rpc1.example.com");
    mockGetLatestLedger.mockResolvedValue({ sequence: 555 });

    const seq = await getLatestLedger(config);
    expect(seq).toBe(555);
  });

  it("throws RpcError when all endpoints fail", async () => {
    const config = makeConfig("https://rpc1.example.com");
    mockGetLatestLedger.mockRejectedValue(new Error("fail"));

    await expect(getLatestLedger(config)).rejects.toThrow(
      /Failed to fetch latest ledger/
    );
  });
});
