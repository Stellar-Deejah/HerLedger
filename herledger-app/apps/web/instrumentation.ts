import { getStellarNetworkConfig, validateNetworkConsistency } from "@herledger/config/server";

export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const config = getStellarNetworkConfig();
    validateNetworkConsistency(
      config.network,
      config.rpcUrl,
      config.networkPassphrase
    );
  }
}
