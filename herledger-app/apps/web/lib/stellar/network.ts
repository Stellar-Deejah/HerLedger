import { Networks } from "@stellar/stellar-sdk";
import { getPublicEnv } from "@herledger/config";

export function getNetworkPassphrase(): string {
  const env = getPublicEnv();
  return env.NEXT_PUBLIC_STELLAR_NETWORK === "mainnet" ? Networks.PUBLIC : Networks.TESTNET;
}
