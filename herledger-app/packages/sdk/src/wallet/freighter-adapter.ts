import { WalletAdapter, WalletConnection } from './types';
import {
  isFreighterAvailable,
  connectWallet,
  getConnectedAddress,
  signTransactionWithFreighter,
} from './freighter';

export class FreighterAdapter implements WalletAdapter {
  name = 'Freighter';

  async isAvailable(): Promise<boolean> {
    return isFreighterAvailable();
  }

  async connect(): Promise<WalletConnection> {
    return connectWallet();
  }

  async disconnect(): Promise<void> {
    // Freighter doesn't have a disconnect method, but we can handle this in the hook
  }

  async getAddress(): Promise<string | null> {
    return getConnectedAddress();
  }

  async signTransaction(xdr: string, passphrase: string, account?: string): Promise<string> {
    return signTransactionWithFreighter(xdr, passphrase, account);
  }

  async isConnected(): Promise<boolean> {
    const address = await getConnectedAddress();
    return address !== null;
  }
}
