import {
  Connection,
  PublicKey,
  SendTransactionError,
  Transaction,
} from '@solana/web3.js';
import { useCallback, useState } from 'react';
import { TransferResult } from './interfaces/transfer';
import { createBatchTransferTransaction } from './transfer/createTransaction';
import { waitForTransactionConfirmation } from './transfer/waitForTransaction';
import { getNetworkName } from './util/network';
import { getWalletAdapter } from './util/wallet';

const BATCH_SIZE = Number(import.meta.env.VITE_TRANSFER_BATCH_SIZE) || 9;
const RPC_RATE_LIMIT = Number(import.meta.env.VITE_RPC_RATE_LIMIT) || 1000;

export function useTokenTransfer(
  connection: Connection,
  publicKey: PublicKey | null
) {
  const [loading, setLoading] = useState(false);

  // バッチトランザクションの作成 - 各受取人の個別金額を扱えるように修正
  useCallback(
    async (
      recipientsWithAmounts: Array<{ recipient: string; amount: number }>,
      fromPublickey: PublicKey,
      mintAddress?: string
    ) => {
      return await createBatchTransferTransaction(
        recipientsWithAmounts,
        fromPublickey,
        connection,
        mintAddress
      );
    },
    [connection]
  );

  // Sender.tsxからの呼び出し用に、個別の金額を持つ受取人のバッチ処理を提供
  const transferWithIndividualAmounts = useCallback(
    async (
      recipientsWithAmounts: Array<{ address: string; amount: number }>,
      mint?: string
    ): Promise<TransferResult[]> => {
      console.warn('transferWithIndividualAmounts');
      if (!publicKey) throw new Error('Wallet not connected');

      if (!recipientsWithAmounts || recipientsWithAmounts.length === 0) {
        throw new Error('Recipients must be a non-empty array');
      }

      setLoading(true);
      const results: TransferResult[] = [];

      try {
        console.log(
          `Starting transfer with individual amounts: ${recipientsWithAmounts.length} recipients, mint: ${mint || 'SOL'}`
        );

        // ウォレットアダプタを事前に取得して検証
        const wallet = getWalletAdapter();
        if (!wallet || typeof wallet.signTransaction !== 'function') {
          throw new Error(
            'Your wallet does not support transaction signing. Please use Phantom or Solflare wallet.'
          );
        }

        // 受取人のフォーマットを変換
        const formattedRecipients = recipientsWithAmounts.map((item) => ({
          recipient: item.address,
          amount: item.amount,
        }));

        // バッチに分割 - 最大BATCH_SIZE件ずつ
        const batches: Array<Array<{ recipient: string; amount: number }>> = [];
        for (let i = 0; i < formattedRecipients.length; i += BATCH_SIZE) {
          batches.push(formattedRecipients.slice(i, i + BATCH_SIZE));
        }
        console.log(
          `Split into ${batches.length} batches of max ${BATCH_SIZE} recipients each`
        );

        const transactions = [];

        // 各バッチを順次処理
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];

          try {
            console.log(
              `Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} recipients`
            );

            // バッチのトランザクション作成
            const transaction = await createBatchTransferTransaction(
              batch,
              publicKey,
              connection,
              mint
            );

            console.log(
              `Transaction created with ${transaction.transaction.message.compiledInstructions.length} instructions`
            );

            transactions.push(transaction);
          } catch (error) {
            console.error(`Batch ${batchIndex + 1} transfer failed:`, error);
          }
        }

        console.log('Requesting wallet signature...');
        const signedTransactions: Transaction[] =
          await wallet.signAllTransactions(
            transactions.map((t) => t.transaction)
          );
        console.log('Transaction signed successfully by wallet');

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const signedTx = transactions[batchIndex];
          const signedTransaction = signedTransactions[batchIndex];
          const batchRecipients = batch.map((item) => item.recipient);
          let signature: string | undefined =
            signedTransactions[batchIndex].signatures[0].signature?.toString(
              'base64'
            );

          try {
            console.log(
              `Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} recipients`
            );

            // 署名されたトランザクションを送信
            console.log('Sending signed transaction to network...');
            signature = await connection.sendRawTransaction(
              signedTransaction.serialize(),
              {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 3,
              }
            );

            console.log(`Transaction sent with signature: ${signature}`);

            // 送信したトランザクションの確認を待機
            const success = await waitForTransactionConfirmation(
              connection,
              signature,
              signedTx.blockhash,
              signedTx.lastValidBlockHeight
            );

            if (success) {
              // バッチ内の各受取人の金額を保持
              const recipientAmounts = batch.map((item) => item.amount);

              // 成功した場合、このバッチのすべての受取人を結果に追加
              results.push({
                signature: signature || '',
                status: 'success',
                timestamp: Date.now(),
                recipients: batchRecipients,
                // 追加情報としてamountsを含める
                amounts: recipientAmounts,
              } as any); // eslint-disable-line

              console.log(
                `Batch ${batchIndex + 1} confirmed successfully with ${batchRecipients.length} recipients`
              );
            } else {
              results.push({
                signature: signature || '',
                status: 'error',
                error: 'Transaction failed confirmation',
                timestamp: Date.now(),
                recipients: batchRecipients,
              });
            }
          } catch (error) {
            if (error instanceof SendTransactionError) {
              console.log(`Batch ${batchIndex + 1} transfer failed:`, error);
            }

            // エラーメッセージをユーザーフレンドリーに
            let errorMessage = 'Transfer failed';

            if (error instanceof Error) {
              errorMessage = error.message;

              // よくあるエラーパターンを処理
              if (error.message.includes('TokenInvalidAccountOwner')) {
                errorMessage = `Invalid token account owner. This token may not exist on the current network (${getNetworkName(connection.rpcEndpoint)}). Try switching networks.`;
              } else if (error.message.includes('TokenInvalidMint')) {
                errorMessage =
                  'Invalid token mint address. Please verify the token address.';
              } else if (error.message.includes('Transaction too large')) {
                errorMessage =
                  'Transaction size exceeded limit. Try sending fewer recipients per batch.';
              }
            }

            results.push({
              signature: signature || '',
              status: 'error',
              error: errorMessage,
              timestamp: Date.now(),
              recipients: batchRecipients,
            });
          }

          // バッチ間の遅延
          if (batchIndex < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        console.log(`Transfer operation completed. Results:`, results);
        return results;
      } catch (error) {
        if (error instanceof Error) {
          // ユーザーによる拒否を検出
          if (
            error.message?.includes('User rejected') ||
            error.message?.includes('Transaction rejected') ||
            error.message?.includes('cancelled') ||
            error.message?.includes('canceled') ||
            error.message?.includes('user rejected') ||
            error.message?.includes('request timed out')
          ) {
            console.log('User cancelled transaction');
            results.push({
              signature: '',
              status: 'error',
              error: 'Transaction cancelled by user',
              timestamp: Date.now(),
              recipients: ['recipientsrecipientsrecipientsrecipients', '?'],
            });
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      } finally {
        setLoading(false);
      }

      return results;
    },
    [connection, publicKey]
  );

  return {
    transferWithIndividualAmounts, // 新しいメソッドとして公開
    loading,
  };
}
