export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    // Dynamic import, deliberately: a static import of @herledger/config/server
    // (which uses process.exit()) still gets bundled into the Edge compilation
    // of this file even though it's only ever called under the nodejs branch
    // above -- the bundler resolves static imports independent of runtime
    // branching. Deferring to a dynamic import keeps it out of the Edge graph.
    const { getStellarNetworkConfig, validateNetworkConsistency } = await import(
      "@herledger/config/server"
    );
    const config = getStellarNetworkConfig();
    validateNetworkConsistency(
      config.network,
      config.rpcUrl,
      config.networkPassphrase
    );
  }
}
