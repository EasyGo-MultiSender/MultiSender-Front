// CSVデータをダウンロードするユーティリティ関数
import { Serializer, TransactionResult } from '../../types/transactionTypes';

export const downloadTransactionsCSV = (
  serializer: Serializer,
  transaction?: TransactionResult
): void => {
  const transactions: TransactionResult[] = serializer.results;

  // ヘッダー行
  const headers = [
    'uuid',
    'signature',
    'status',
    'error',
    'error_message',
    'sender_wallet',
    'token_type',
    'token_symbol',
    'token_mint_address',
    'time_stamp',
    'recipient_wallet',
    'amount',
  ].join(',');

  // 改行文字を文字列"\n"に変換する関数
  const escapeNewlines = (str: string): string => {
    if (!str) return '';
    return str.replace(/\r?\n/g, '\\n');
  };

  const encodeCSVField = (str: string): string => {
    if (!str) return '';
    // ダブルクォートでフィールドを囲み、内部のダブルクォートはエスケープする
    return `"${str.replace(/"/g, '""')}"`;
  };

  // 行を生成する共通関数
  const createRow = (
    transaction: TransactionResult,
    recipient: { address: string; amount: number }
  ) => {
    return [
      serializer.uuid,
      transaction.signature,
      transaction.status,
      encodeCSVField(escapeNewlines(transaction.error || '')),
      encodeCSVField(escapeNewlines(transaction.errorMessage || '')),
      serializer.senderWallet,
      serializer.tokenType,
      serializer.tokenSymbol,
      serializer.tokenMintAddress,
      serializer.timestamp,
      recipient.address, // recipient_wallet
      recipient.amount.toString(), // amount
    ].join(',');
  };

  // すべての取引と受信者ごとに行を作成
  const rows: string[] = [];

  if (transaction === undefined) {
    transactions.forEach((transaction) => {
      transaction.recipients.forEach((recipient) => {
        rows.push(createRow(transaction, recipient));
      });
    });
  } else {
    transaction.recipients.forEach((recipient) => {
      rows.push(createRow(transaction, recipient));
    });
  }

  // CSV文字列を作成
  const csvContent = `${headers}\n${rows.join('\n')}`;

  // Blobを作成しダウンロード
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute(
    'download',
    `transactions_${new Date().toISOString().split('.')[0].replace(/[-:]/g, '')}.csv`
  );
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
