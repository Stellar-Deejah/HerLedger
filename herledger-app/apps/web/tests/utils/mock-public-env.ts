// Test-only fixture for `getPublicEnv()`. Contract addresses must satisfy
// registry.ts's `looksLikeContractAddress` (`/^C[A-Z0-9]{55}$/`) — real
// StrKey contract addresses are exactly 56 characters — or
// `buildContractConfig()` throws a ValidationError before a test's mocked
// `registerBusiness` is ever reached. Plain placeholders like
// "CBUSINESSREGISTRY" are too short and will fail that check silently.
export const TEST_BUSINESS_REGISTRY_ID = "C" + "A".repeat(55);
export const TEST_FINANCIAL_LEDGER_ID = "C" + "B".repeat(55);
export const TEST_ATTESTATION_REGISTRY_ID = "C" + "D".repeat(55);

export function mockPublicEnv() {
  return {
    NEXT_PUBLIC_STELLAR_NETWORK: "testnet" as const,
    NEXT_PUBLIC_STELLAR_RPC_URL: "https://example-rpc.test",
    NEXT_PUBLIC_BUSINESS_REGISTRY_CONTRACT_ID: TEST_BUSINESS_REGISTRY_ID,
    NEXT_PUBLIC_FINANCIAL_LEDGER_CONTRACT_ID: TEST_FINANCIAL_LEDGER_ID,
    NEXT_PUBLIC_ATTESTATION_REGISTRY_CONTRACT_ID: TEST_ATTESTATION_REGISTRY_ID,
  };
}
