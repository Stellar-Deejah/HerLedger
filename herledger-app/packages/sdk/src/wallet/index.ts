// ---------------------------------------------------------------------------
// `@herledger/sdk/wallet` — Freighter wallet adapter. Signer only: this is not
// application authentication.
// ---------------------------------------------------------------------------

export {
  isFreighterAvailable,
  connectWallet,
  getConnectedAddress,
  signTransactionWithFreighter,
} from "./freighter.js";
export type { WalletConnection } from "./freighter.js";
