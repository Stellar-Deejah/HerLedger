import { describe, it, expect, beforeAll } from "vitest";
import {
  createContractAddressRegistry,
  buildContractConfig,
  getBusiness,
  getFinancialEvent,
  getAttestation,
  type StellarNetworkConfig,
  type ContractConfig,
} from "../../index.js";

// ---------------------------------------------------------------------------
// Testnet smoke tests.
//
// These make real RPC calls against the deployed testnet contracts to catch
// encoding drift the unit tests (which don't touch the network) can't see —
// e.g. a contract redeployed with a changed method signature that the SDK's
// XDR encoding no longer matches.
//
// Guarded by TEST_AGAINST_TESTNET=true so they never run by default in
// `pnpm test` / local dev, and don't require network access or testnet
// contract IDs to be configured. CI runs them nightly and on SDK version
// bumps — see .github/workflows/ci.yml (job: testnet-smoke).
//
// These only exercise read (`simulateTransaction`) paths — no write, no
// signing, no funded account required.
//
// IMPORTANT: env/config lookups (`requireEnv`, registry construction) live
// inside `beforeAll`, not directly in the `describe` body. Vitest/Jest still
// execute a `describe` callback's own body synchronously during test
// collection even when wrapped in `describe.skip` — only hooks (`beforeAll`,
// `beforeEach`) and `it` bodies are actually skipped. Putting a throwing
// `requireEnv()` call directly in the describe body would throw during
// collection regardless of TEST_AGAINST_TESTNET, breaking `pnpm test` for
// everyone by default.
// ---------------------------------------------------------------------------

const RUN_SMOKE = process.env.TEST_AGAINST_TESTNET === "true";

const describeIfSmoke = RUN_SMOKE ? describe : describe.skip;

describeIfSmoke("testnet smoke tests", () => {
  let config: StellarNetworkConfig;
  let contracts: ContractConfig;

  beforeAll(() => {
    config = {
      network: "testnet",
      rpcUrl: process.env.STELLAR_RPC_URL ?? "https://soroban-testnet.stellar.org",
      horizonUrl: process.env.STELLAR_HORIZON_URL ?? "https://horizon-testnet.stellar.org",
      networkPassphrase:
        process.env.STELLAR_NETWORK_PASSPHRASE ?? "Test SDF Network ; September 2015",
    };

    const businessRegistryId = requireEnv("BUSINESS_REGISTRY_CONTRACT_ID");
    const financialLedgerId = requireEnv("FINANCIAL_LEDGER_CONTRACT_ID");
    const attestationRegistryId = requireEnv("ATTESTATION_REGISTRY_CONTRACT_ID");

    const registry = createContractAddressRegistry({
      businessRegistry: { testnet: businessRegistryId },
      financialLedger: { testnet: financialLedgerId },
      attestationRegistry: { testnet: attestationRegistryId },
    });

    contracts = buildContractConfig(registry, "testnet", {
      businessRegistryId,
      financialLedgerId,
      attestationRegistryId,
    });
  });

  // A syntactically valid but almost certainly unregistered 32-byte hex ID.
  // The point isn't finding a real record — it's confirming the SDK's XDR
  // encoding round-trips against the live contract without an RPC/encoding
  // error. A clean "not found" (null) result is a pass.
  const PROBE_ID = "00".repeat(32);

  it("BusinessRegistry.get_business round-trips against testnet", async () => {
    const result = await getBusiness(PROBE_ID, config, contracts);
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("FinancialLedger.get_event round-trips against testnet", async () => {
    const result = await getFinancialEvent(PROBE_ID, config, contracts);
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("AttestationRegistry.get_attestation round-trips against testnet", async () => {
    const result = await getAttestation(PROBE_ID, config, contracts);
    expect(result === null || typeof result === "object").toBe(true);
  });
});

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} must be set when TEST_AGAINST_TESTNET=true. ` +
        `See .env.example / CI secrets (job: testnet-smoke).`
    );
  }
  return value;
}
