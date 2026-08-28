export interface WalletAdapter {
  name: string;
  isAvailable(): Promise<boolean>;
  connect(): Promise<WalletConnection>;
  disconnect(): Promise<void>;
  getAddress(): Promise<string | null>;
  signTransaction(xdr: string, passphrase: string, account?: string): Promise<string>;
  isConnected(): Promise<boolean>;
}

export interface WalletConnection {
  publicKey: string;
  network: string;
}

export interface WalletAccount {
  address: string;
  name?: string;
}
