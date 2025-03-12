// src/providers/WalletProvider.tsx
import { clusterApiUrl } from '@solana/web3.js';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { FC, ReactNode, useMemo, useEffect } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import '@solana/wallet-adapter-react-ui/styles.css';

interface Props {
  children: ReactNode;
}

export const WalletConnectionProvider: FC<Props> = ({ children }) => {
  // Get network from localStorage or fallback to env/default
  const savedNetwork = window.localStorage.getItem(
    'network'
  ) as WalletAdapterNetwork;

  const network =
    savedNetwork ||
    (import.meta.env.VITE_SOLANA_NETWORK as WalletAdapterNetwork) ||
    (import.meta.env.VITE_SOLANA_DEV_NETWORK as WalletAdapterNetwork) ||
    WalletAdapterNetwork.Devnet;

  const savedEndpoint = window.localStorage.getItem('endpoint');

  // Use saved endpoint or fallback to appropriate env variable based on network
  const endpoint =
    savedEndpoint ||
    (network === WalletAdapterNetwork.Mainnet
      ? import.meta.env.VITE_RPC_ENDPOINT
      : import.meta.env.VITE_SOLANA_DEV_RPC_ENDPOINT) ||
    clusterApiUrl(network);

  // Configure available wallets
  const wallets = useMemo(
    () => [],
    [network] // Update when network changes
  );

  // function to hide phantom and solflare wallets
  useEffect(() => {
    // モーダルが開かれたときにPhantom以外を非表示にする
    const observer = new MutationObserver((mutations) => {
      // モーダルリストを探す
      const walletList = document.querySelector('.wallet-adapter-modal-list');
      if (walletList) {
        // すべてのリスト項目を取得
        const listItems = walletList.querySelectorAll('li');

        // 各項目を確認
        listItems.forEach((item) => {
          const button = item.querySelector('button');
          // ボタンがない、またはPhantom/Solflare/Backpack以外のボタンの場合は非表示
          if (
            !button ||
            (!button.textContent?.includes('Phantom') &&
              !button.textContent?.includes('Solflare') &&
              !button.textContent?.includes('Backpack'))
          ) {
            item.style.display = 'none'; // Phantom/Solflare/Backpack以外は非表示
          } else {
            item.style.display = 'block'; // Phantom/Solflare/Backpackは表示
          }
        });

        // 「More options」ボタンも非表示
        const moreOptions = document.querySelector(
          '.wallet-adapter-modal-list-more'
        );
        if (moreOptions) {
          moreOptions.setAttribute('style', 'display: none !important');
        }
      }
    });

    // body要素の変更を監視開始
    observer.observe(document.body, { childList: true, subtree: true });

    // クリーンアップ関数
    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
