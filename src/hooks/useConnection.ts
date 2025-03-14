import { Connection } from '@solana/web3.js';
import { useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';

export const useConnection = () => {
  const connection = useMemo(() => {
    // Get saved endpoint from localStorage or fall back to env/default
    const savedEndpoint = window.localStorage.getItem('endpoint');
    const savedNetwork = window.localStorage.getItem(
      'network'
    ) as WalletAdapterNetwork;

    const network =
      savedNetwork ||
      (import.meta.env.VITE_SOLANA_NETWORK as WalletAdapterNetwork) ||
      (import.meta.env.VITE_SOLANA_DEV_NETWORK as WalletAdapterNetwork) ||
      WalletAdapterNetwork.Devnet;

    const endpoint =
      savedEndpoint ||
      (network === WalletAdapterNetwork.Mainnet
        ? import.meta.env.VITE_RPC_ENDPOINT
        : import.meta.env.VITE_SOLANA_DEV_RPC_ENDPOINT) ||
      clusterApiUrl(network);

    return new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }, []);

  return { connection };
};
