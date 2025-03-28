import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { Connection } from '@solana/web3.js';
import { useMemo } from 'react';

export const useConnection = () => {
  const connection = useMemo(() => {
    const strNetwork = window.localStorage.getItem('network');

    console.log('Network( localStorage ):', strNetwork);

    const savedNetwork = strNetwork as WalletAdapterNetwork;

    const network =
      savedNetwork ||
      (import.meta.env.VITE_SOLANA_NETWORK as WalletAdapterNetwork) ||
      (import.meta.env.VITE_SOLANA_DEV_NETWORK as WalletAdapterNetwork) ||
      WalletAdapterNetwork.Devnet;

    let endpoint = import.meta.env.VITE_RPC_ENDPOINT;

    if (network === WalletAdapterNetwork.Devnet)
      endpoint = import.meta.env.VITE_SOLANA_DEV_RPC_ENDPOINT;

    if (
      strNetwork === 'custom' &&
      window.localStorage.getItem('endpoint') != null
    ) {
      endpoint = window.localStorage.getItem('endpoint') as string;
      console.log('Endpoint( localStorage ):', endpoint);
    }

    console.log('Endpoint:', endpoint);

    return new Connection(endpoint, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }, []);

  return { connection };
};
