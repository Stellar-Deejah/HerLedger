// ---------------------------------------------------------------------------
// WalletProvider interface
// Defines the contract every wallet adapter must implement.
// Adding a new wallet (Albedo, xBull, WalletConnect …) means implementing
// this interface — no call sites in apps/web need to change.
// ---------------------------------------------------------------------------

/**
 * The result of a successful wallet connection.
 */
export interface WalletConnection {
  publicKey: string;
  network: string;
}

/**
 * Minimal interface every wallet adapter must implement.
 *
 * All methods are async and throw `WalletError` on failure so callers can
 * handle every adapter uniformly.
 *
 * @example
 * ```ts
 * class MyWallet implements WalletProvider {
 *   async connect() { … }
 *   async disconnect() { … }
 *   async getAddress() { … }
 *   async signTransaction(xdr, passphrase, address?) { … }
 * }
 * ```
 */
export interface WalletProvider {
  /**
   * Request access and return the connected public key + network.
   * Throws `WalletError` if the wallet is unavailable or the user rejects.
   */
  connect(): Promise<WalletConnection>;

  /**
   * Disconnect / clear local session state.
   * Implementations that have no session concept may resolve immediately.
   */
  disconnect(): Promise<void>;

  /**
   * Return the currently connected public key, or `null` if not connected.
   * Must NOT prompt the user — use `connect()` for that.
   */
  getAddress(): Promise<string | null>;

  /**
   * Sign a Stellar transaction XDR and return the signed XDR.
   *
   * @param transactionXdr  - Base64-encoded unsigned transaction envelope.
   * @param networkPassphrase - Stellar network passphrase used during build.
   * @param accountToSign   - Optional: the specific account to sign with.
   * @throws `WalletError` if the user rejects or signing fails.
   */
  signTransaction(
    transactionXdr: string,
    networkPassphrase: string,
    accountToSign?: string
  ): Promise<string>;
}
