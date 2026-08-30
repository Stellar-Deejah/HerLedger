import { Contract, TransactionBuilder, Account, rpc as StellarRpc } from "@stellar/stellar-sdk";
import { getSorobanRpcServer, encodeAddress } from "@herledger/sdk";
import type { StellarNetworkConfig, ContractConfig } from "@herledger/sdk";
import { logger } from "../observability/index.js";
import { retryWithBackoff } from "./retry.js";

// ---------------------------------------------------------------------------
// Dynamic asset list cache
//
// The FinancialLedger contract maintains the authoritative list of supported
// assets. Rather than making an RPC call for every payment to check
// `isSupportedAsset`, this module fetches the list at indexer startup and
// refreshes it periodically. The cache is used by `isSupportedAssetAddress`
// for fast, local lookups.
//
// Refresh strategy:
// - Fetch at startup (lazy, on first call to `getSupportedAssets`)
// - Refresh every `REFRESH_INTERVAL_LEDGERS` ledgers (configurable, default 1000)
// - On RPC failure, fall back to the last known list (never return empty)
// ---------------------------------------------------------------------------

const READ_ACCOUNT = "GAAZI4TCR3TY5OJHCTJC2A4QSY6CJWJH5IAJTGKIN2ER7LBNVKOCCWN";

export interface AssetCacheConfig {
  /** How many ledgers between refreshes. Default: 1000. */
  refreshIntervalLedgers?: number;
}

interface CacheState {
  assets: Set<string>;
  lastRefreshLedger: number;
  refreshInProgress: boolean;
}

let _cache: CacheState = {
  assets: new Set(),
  lastRefreshLedger: 0,
  refreshInProgress: false,
};

/**
 * Fetch the list of supported asset addresses from the FinancialLedger
 * contract. Uses the same retry/backoff helper as other RPC calls.
 *
 * The contract's `get_supported_assets` method returns a vector of addresses.
 * We simulate a read-only transaction to avoid paying fees.
 */
async function fetchSupportedAssetsFromContract(
  config: StellarNetworkConfig,
  contracts: ContractConfig
): Promise<string[]> {
  return retryWithBackoff(async () => {
    const contract = new Contract(contracts.financialLedgerId);
    const tx = new TransactionBuilder(new Account(READ_ACCOUNT, "0"), {
      fee: "100",
      networkPassphrase: config.networkPassphrase,
    })
      .addOperation(contract.call("get_supported_assets"))
      .setTimeout(30)
      .build();

    const server = getSorobanRpcServer(config);
    const sim = await server.simulateTransaction(tx);

    if (StellarRpc.Api.isSimulationError(sim)) {
      throw new Error(`get_supported_assets simulation error: ${sim.error}`);
    }

    const retval = sim.result?.retval;
    if (!retval) return [];

    const vec = retval.vec();
    if (!vec) return [];

    return vec.map((val) => {
      const addr = val.address();
      return addr ?? "";
    });
  }, "fetchSupportedAssetsFromContract");
}

/**
 * Get the current supported asset set. Triggers a refresh if:
 * - The cache has never been populated (lastRefreshLedger === 0)
 * - More than `refreshIntervalLedgers` ledgers have passed since last refresh
 *
 * On RPC failure, returns the last known set (or empty if never populated).
 */
export async function getSupportedAssets(
  config: StellarNetworkConfig,
  contracts: ContractConfig,
  currentLedger: number,
  cacheConfig?: AssetCacheConfig
): Promise<Set<string>> {
  const interval = cacheConfig?.refreshIntervalLedgers ?? 1000;
  const needsRefresh =
    _cache.lastRefreshLedger === 0 ||
    currentLedger - _cache.lastRefreshLedger >= interval;

  if (needsRefresh && !_cache.refreshInProgress) {
    _cache.refreshInProgress = true;
    try {
      const assets = await fetchSupportedAssetsFromContract(config, contracts);
      if (assets.length > 0) {
        _cache = {
          assets: new Set(assets),
          lastRefreshLedger: currentLedger,
          refreshInProgress: false,
        };
        logger.info(
          {
            event: "asset_cache_refresh",
            assetCount: assets.length,
            ledger: currentLedger,
          },
          "Supported asset list refreshed from contract"
        );
      } else {
        // Empty result — possibly a contract error. Keep the old cache.
        _cache.refreshInProgress = false;
        logger.warn(
          {
            event: "asset_cache_refresh_empty",
            ledger: currentLedger,
          },
          "Contract returned empty asset list — keeping previous cache"
        );
      }
    } catch (cause) {
      _cache.refreshInProgress = false;
      logger.warn(
        {
          event: "asset_cache_refresh_error",
          ledger: currentLedger,
          error: cause instanceof Error ? cause.message : String(cause),
        },
        "Failed to refresh asset list from contract — using cached values"
      );
    }
  }

  return _cache.assets;
}

/**
 * Reset the cache to its initial state. Used in tests.
 */
export function resetAssetCache(): void {
  _cache = {
    assets: new Set(),
    lastRefreshLedger: 0,
    refreshInProgress: false,
  };
}
