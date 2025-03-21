import { PublicKey } from '@solana/web3.js';
import { CSVValidationResult } from '@/hooks/interfaces/transfer.ts';
import { AddressEntry } from '@/types/transactionTypes.ts';

export const useWalletAddressValidation = () => {
  // Solanaウォレットアドレスの妥当性をチェックする関数
  const isValidSolanaAddress = (address: string): boolean => {
    try {
      // PublicKeyのコンストラクターでアドレスの妥当性をチェック
      const publicKey = new PublicKey(address);

      // base58エンコードされた44-46文字のアドレスであることを確認
      return (
        publicKey.toBase58() === address &&
        address.length >= 32 &&
        address.length <= 44
      );
    } catch (error) {
      return false;
    }
  };

  // アドレスリストの妥当性と重複をチェックする関数
  const validateAddresses = (
    addresses: string[]
  ): {
    validAddresses: string[];
    invalidAddresses: string[];
    duplicateAddresses: string[];
  } => {
    // トリムと空白除去
    const trimmedAddresses = addresses
      .map((addr) => addr.trim())
      .filter((addr) => addr.length > 0);

    // 妥当性のないアドレスを特定
    const invalidAddresses = trimmedAddresses.filter(
      (addr) => !isValidSolanaAddress(addr)
    );

    // 重複アドレスを特定
    const addressCounts = trimmedAddresses.reduce(
      (acc, addr) => {
        acc[addr] = (acc[addr] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

    const duplicateAddresses = Object.keys(addressCounts).filter(
      (addr) => addressCounts[addr] > 1
    );

    // 有効なアドレスを取得（重複と無効なアドレスを除外）
    const validAddresses = trimmedAddresses.filter(
      (addr) =>
        !invalidAddresses.includes(addr) && !duplicateAddresses.includes(addr)
    );

    return {
      validAddresses,
      invalidAddresses,
      duplicateAddresses,
    };
  };

  return {
    isValidSolanaAddress,
    validateAddresses,
  };
};

export const validationCSV = (
  SOL_VALIDATION_AMOUNT: string,
  recipientAddresses: string,
  isValidSolanaAddress: (address: string) => boolean,
  selectedToken: string
): CSVValidationResult => {
  let entries: AddressEntry[] = [];
  const invalidLineNumbers: number[] = []; // 無効な行の行番号を追跡
  const addressMap = new Map<string, number>();
  // SOL最小額チェック用の配列
  const belowMinimumSolLines: string[] = [];
  const belowMinimumSolLineNumbers: number[] = []; // SOL最小額未満の行番号

  // 最小SOL額の取得（設定されていない場合は0を使用）
  const minSolAmount = parseFloat(SOL_VALIDATION_AMOUNT) || 0;

  // 各行を解析
  const lines = recipientAddresses
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const parts = line.split(',').map((part) => part.trim());
    const address = parts[0];
    const amountStr = parts[1];

    const amount = parseFloat(amountStr);

    // アドレスとアマウントの検証
    if (
      !address ||
      !isValidSolanaAddress(address) ||
      !amountStr ||
      isNaN(amount) ||
      (amountStr.startsWith('0') && !amountStr.startsWith('0.'))
    ) {
      invalidLineNumbers.push(i + 1);
      continue;
    }

    // SOL選択時の最小額チェック
    if (
      (selectedToken === 'SOL' && amount < minSolAmount && minSolAmount > 0) ||
      (selectedToken !== 'SOL' && amount <= 0)
    ) {
      belowMinimumSolLines.push(line);
      belowMinimumSolLineNumbers.push(i + 1);
      continue;
    }

    // 有効なエントリを追加
    entries.push({ address, amount });

    // 重複アドレスを追跡
    addressMap.set(address, (addressMap.get(address) || 0) + 1);
  }

  // 重複アドレスの特定
  const duplicates = Array.from(addressMap.entries())
    .filter(([_, count]) => count > 1)
    .map(([address]) => address);

  // 重複アドレスの行番号を特定
  const duplicateLineNumbers: number[] = [];
  if (duplicates.length > 0) {
    recipientAddresses.split('\n').forEach((line, index) => {
      const parts = line.split(',');
      const address = parts[0]?.trim();
      if (address && duplicates.includes(address)) {
        duplicateLineNumbers.push(index + 1); // 1-indexed
      }
    });

    entries = entries.filter((e) => !duplicates.includes(e.address));
  }

  invalidLineNumbers.push(...duplicateLineNumbers);

  return {
    invalidLineNumbers,
    entries,
    duplicateLineNumbers,
    duplicates,
    belowMinimumSolLines,
    belowMinimumSolLineNumbers,
  };
};
