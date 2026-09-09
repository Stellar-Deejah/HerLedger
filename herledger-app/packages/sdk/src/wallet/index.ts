// ---------------------------------------------------------------------------
// `@herledger/sdk/wallet` — Freighter wallet adapter. Signer only: this is not
// application authentication.
// ---------------------------------------------------------------------------

export {
  isFreighterAvailable,
  connectWallet,
  getConnectedAddress,
  signTransactionWithFreighter,
} from "./freighter";
export type { WalletConnection } from "./freighter";
