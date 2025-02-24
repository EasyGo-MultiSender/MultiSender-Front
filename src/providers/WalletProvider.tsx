// src/providers/WalletProvider.tsx
import { FC, ReactNode, useMemo } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { ConnectionProvider, WalletProvider } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { clusterApiUrl } from '@solana/web3.js';

// Wallet modal styles
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export const WalletConnectionProvider: FC<Props> = ({ children }) => {
  // Get network from localStorage or fallback to env/default
  const savedNetwork = window.localStorage.getItem('network') as WalletAdapterNetwork;
  
  const network = savedNetwork || 
    (import.meta.env.VITE_SOLANA_NETWORK as WalletAdapterNetwork) || 
    (import.meta.env.VITE_SOLANA_DEV_NETWORK as WalletAdapterNetwork) || 
    WalletAdapterNetwork.Devnet;

  const savedEndpoint = window.localStorage.getItem('endpoint');
  
  // Use saved endpoint or fallback to appropriate env variable based on network
  const endpoint = savedEndpoint || 
    (network === WalletAdapterNetwork.Mainnet ? import.meta.env.VITE_RPC_ENDPOINT : import.meta.env.VITE_SOLANA_DEV_RPC_ENDPOINT) || 
    clusterApiUrl(network);

  // Configure available wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    [network] // Update when network changes
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};