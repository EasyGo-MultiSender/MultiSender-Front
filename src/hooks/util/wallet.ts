// ウォレットを取得する関数
export const getWalletAdapter = () => {
  // 利用可能なウォレット候補を、型を明示したオブジェクトの配列で管理

  const possibleWallets = [
    window.phantom?.solana,
    window.solflare,
    window.solana,
    window.xnft?.solana,
  ];

  // 最初に見つかった有効なウォレットを使用
  for (const wallet of possibleWallets) {
    if (wallet && wallet?.isConnected) {
      console.log(
        `Using wallet provider: ${wallet.isPhantom ? 'Phantom' : wallet.isSolflare ? 'Solflare' : 'Unknown'}`
      );
      return wallet;
    }
  }

  // ウォレット接続ボタンが表示されているか確認
  const walletMultiButton = document.querySelector('.wallet-adapter-button');
  if (walletMultiButton) {
    throw new Error(
      'Please use the Wallet Connect button in the header to connect your wallet'
    );
  } else {
    throw new Error(
      'No compatible wallet found. Please install Phantom or Solflare wallet and refresh the page'
    );
  }
};
