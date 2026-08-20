import { Account, Horizon } from "@stellar/stellar-sdk";
import { getServerStellarConfig } from "./server-config";

export async function getAccount(address: string): Promise<Account> {
  const config = getServerStellarConfig();
  const server = new Horizon.Server(config.horizonUrl);
  const record = await server.loadAccount(address);
  return new Account(record.accountId(), record.sequenceNumber());
}
