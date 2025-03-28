import { useWallet as useSolanaWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useCallback, useMemo } from 'react';

export const useWallet = () => {
  const {
    publicKey,
    wallet,
    connected,
    connecting,
    disconnecting,
    disconnect: disconnectWallet,
  } = useSolanaWallet();

  const { setVisible } = useWalletModal();

  // ウォレットアドレスを短縮表示用のフォーマットに変換
  const shortenAddress = useCallback((address: string) => {
    return `${address.slice(0, 5)}...${address.slice(-4)}`;
  }, []);

  // ウォレット接続モーダルを表示
  const connect = useCallback(() => {
    setVisible(true);
  }, [setVisible]);

  // 切断処理
  const disconnect = useCallback(async () => {
    try {
      await disconnectWallet();
    } catch (error) {
      console.error('Wallet disconnection failed:', error);
    }
  }, [disconnectWallet]);

  // 現在のウォレット情報
  const walletInfo = useMemo(() => {
    if (!connected || !publicKey) return null;

    return {
      name: wallet?.adapter.name,
      address: publicKey.toString(),
      shortAddress: shortenAddress(publicKey.toString()),
    };
  }, [wallet, publicKey, connected, shortenAddress]);

  // ウォレットの状態
  const walletState = useMemo(
    () => ({
      isConnected: connected,
      isConnecting: connecting,
      isDisconnecting: disconnecting,
      hasWallet: !!wallet,
    }),
    [connected, connecting, disconnecting, wallet]
  );

  return {
    // State
    ...walletState,
    wallet,
    publicKey,
    connected,
    connecting,
    walletInfo,

    // Methods
    connect,
    disconnect,
    shortenAddress,
  };
};
