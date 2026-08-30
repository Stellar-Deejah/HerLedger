import { describe, it, expect, vi, beforeEach } from "vitest";
import { getSupportedAssets, resetAssetCache } from "../asset-cache.js";

// Mock the RPC and SDK modules
vi.mock("@herledger/sdk", () => ({
  getSorobanRpcServer: vi.fn(() => ({
    simulateTransaction: vi.fn().mockResolvedValue({
      result: {
        retval: {
          vec: () => [
            { address: () => "CABC" },
            { address: () => "CXYZ" },
          ],
        },
      },
    }),
  })),
}));

vi.mock("@herledger/sdk/contracts", () => ({
  encodeAddress: vi.fn((addr: string) => addr),
}));

vi.mock("../retry.js", () => ({
  retryWithBackoff: vi.fn(async (fn: () => Promise<unknown>) => fn()),
}));

describe("AssetCache", () => {
  const mockConfig = {
    networkPassphrase: "Test SDF Network ; September 2015",
  } as any;
  const mockContracts = {
    financialLedgerId: "CLEDGER",
  } as any;

  beforeEach(() => {
    resetAssetCache();
  });

  it("fetches assets from contract on first call", async () => {
    const assets = await getSupportedAssets(mockConfig, mockContracts, 100);
    expect(assets).toBeInstanceOf(Set);
    expect(assets.has("CABC")).toBe(true);
    expect(assets.has("CXYZ")).toBe(true);
  });

  it("returns cached assets on subsequent calls within refresh interval", async () => {
    await getSupportedAssets(mockConfig, mockContracts, 100);
    const assets2 = await getSupportedAssets(mockConfig, mockContracts, 500);
    expect(assets2.has("CABC")).toBe(true);
  });

  it("refreshes when ledger exceeds refresh interval", async () => {
    await getSupportedAssets(mockConfig, mockContracts, 100, {
      refreshIntervalLedgers: 100,
    });
    // 100 + 100 = 200, which meets the interval
    const assets = await getSupportedAssets(mockConfig, mockContracts, 200, {
      refreshIntervalLedgers: 100,
    });
    expect(assets.has("CABC")).toBe(true);
  });

  it("returns empty set when cache has never been populated and RPC fails", async () => {
    const { getSorobanRpcServer } = await import("@herledger/sdk");
    vi.mocked(getSorobanRpcServer).mockReturnValueOnce({
      simulateTransaction: vi.fn().mockRejectedValue(new Error("RPC down")),
    } as any);

    const assets = await getSupportedAssets(mockConfig, mockContracts, 100);
    expect(assets.size).toBe(0);
  });

  it("resetAssetCache clears the cache", async () => {
    await getSupportedAssets(mockConfig, mockContracts, 100);
    resetAssetCache();
    // After reset, should fetch again (lastRefreshLedger is 0)
    const assets = await getSupportedAssets(mockConfig, mockContracts, 200);
    expect(assets.has("CABC")).toBe(true);
  });
});
