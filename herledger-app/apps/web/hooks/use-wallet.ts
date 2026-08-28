'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { FreighterAdapter, WalletAdapter, WalletConnection } from '@herledger/sdk';

const POLL_INTERVAL = 5000; // 5 seconds

export interface UseWalletReturn {
  wallet: WalletAdapter;
  isConnected: boolean;
  address: string | null;
  network: string | null;
  loading: boolean;
  error: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (xdr: string, passphrase: string, account?: string) => Promise<string>;
}

export function useWallet(): UseWalletReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walletRef = useRef<WalletAdapter>(new FreighterAdapter());
  const addressRef = useRef<string | null>(null);

  const checkConnection = useCallback(async () => {
    try {
      const connected = await walletRef.current.isConnected();
      if (connected) {
        const currentAddress = await walletRef.current.getAddress();
        if (currentAddress && currentAddress !== addressRef.current) {
          addressRef.current = currentAddress;
          setAddress(currentAddress);
          setIsConnected(true);
        } else if (!currentAddress) {
          addressRef.current = null;
          setAddress(null);
          setIsConnected(false);
          setNetwork(null);
        }
      } else {
        if (addressRef.current !== null) {
          addressRef.current = null;
          setAddress(null);
          setIsConnected(false);
          setNetwork(null);
        }
      }
    } catch (err) {
      console.error('Error checking wallet connection:', err);
    }
  }, []);

  useEffect(() => {
    void checkConnection();

    const interval = setInterval(checkConnection, POLL_INTERVAL);

    return () => {
      clearInterval(interval);
    };
  }, [checkConnection]);

  const connect = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const connection: WalletConnection = await walletRef.current.connect();
      setAddress(connection.publicKey);
      setNetwork(connection.network);
      setIsConnected(true);
      addressRef.current = connection.publicKey;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to connect wallet';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    void walletRef.current.disconnect();
    setAddress(null);
    setNetwork(null);
    setIsConnected(false);
    addressRef.current = null;
  }, []);

  const signTransaction = useCallback(async (xdr: string, passphrase: string, account?: string) => {
    return walletRef.current.signTransaction(xdr, passphrase, account);
  }, []);

  return {
    wallet: walletRef.current,
    isConnected,
    address,
    network,
    loading,
    error,
    connect,
    disconnect,
    signTransaction,
  };
}
