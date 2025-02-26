import { PublicKey } from '@solana/web3.js';

export const useWalletAddressValidation = () => {
  // Solanaウォレットアドレスの妥当性をチェックする関数
  const isValidSolanaAddress = (address: string): boolean => {
    try {
      // PublicKeyのコンストラクターでアドレスの妥当性をチェック
      const publicKey = new PublicKey(address);
      
      // base58エンコードされた44-46文字のアドレスであることを確認
      return publicKey.toBase58() === address && 
             address.length >= 32 && 
             address.length <= 44;
    } catch (error) {
      return false;
    }
  };

  // アドレスリストの妥当性と重複をチェックする関数
  const validateAddresses = (addresses: string[]): {
    validAddresses: string[];
    invalidAddresses: string[];
    duplicateAddresses: string[];
  } => {
    // トリムと空白除去
    const trimmedAddresses = addresses
      .map(addr => addr.trim())
      .filter(addr => addr.length > 0);

    // 妥当性のないアドレスを特定
    const invalidAddresses = trimmedAddresses.filter(addr => !isValidSolanaAddress(addr));
    
    // 重複アドレスを特定
    const addressCounts = trimmedAddresses.reduce((acc, addr) => {
      acc[addr] = (acc[addr] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const duplicateAddresses = Object.keys(addressCounts)
      .filter(addr => addressCounts[addr] > 1);

    // 有効なアドレスを取得（重複と無効なアドレスを除外）
    const validAddresses = trimmedAddresses.filter(
      addr => !invalidAddresses.includes(addr) && !duplicateAddresses.includes(addr)
    );

    return {
      validAddresses,
      invalidAddresses,
      duplicateAddresses
    };
  };

  return {
    isValidSolanaAddress,
    validateAddresses
  };
};