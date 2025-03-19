import {
  Connection,
  PublicKey,
  SendTransactionError,
  Transaction,
  VersionedTransaction,
} from '@solana/web3.js';
import { useCallback, useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { TransferResult } from './interfaces/transfer';
import { createBatchTransferTransaction } from './transfer/createTransaction';
import { waitForTransactionConfirmation } from './transfer/waitForTransaction';
import { useTokenMetadata } from './useTokenMetadata';
import { getNetworkName } from './util/network';
import {
  generateTimeStamp,
  postSignatureData,
  SignaturePayload,
} from './util/postData';
import { getWalletAdapter } from './util/wallet';
// カスタムフックのインポート
import { useTranslation } from 'react-i18next';

const RPC_RATE_LIMIT = Number(import.meta.env.VITE_RPC_RATE_LIMIT) || 1000;

// メッセージ更新用の型定義
type ProcessingMessageUpdater = (message: string) => void;

export function useTokenTransfer(
  connection: Connection,
  publicKey: PublicKey | null,
  processingMessageUpdater?: ProcessingMessageUpdater
) {
  const [loading, setLoading] = useState(false);
  const { fetchMetadata } = useTokenMetadata(connection);

  const { t } = useTranslation(); // 翻訳フック

  // 安全にメッセージを更新するヘルパー関数
  const updateMessage = useCallback(
    (message: string) => {
      if (processingMessageUpdater) {
        processingMessageUpdater(message);
      }
    },
    [processingMessageUpdater]
  );

  // ミントアドレスからトークンシンボルを取得する関数
  const getTokenSymbol = useCallback(
    async (mintAddress: string): Promise<string> => {
      try {
        const metadata = await fetchMetadata(mintAddress);
        return metadata?.symbol || 'UNKNOWN';
      } catch (error) {
        console.error('Error fetching token symbol:', error);
        return 'UNKNOWN';
      }
    },
    [fetchMetadata]
  );

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
      mint?: string,
      now: number = Date.now()
    ): Promise<{ result: TransferResult[]; uuid: string }> => {
      console.warn('transferWithIndividualAmounts');
      if (!publicKey) throw new Error('Wallet not connected');

      if (!recipientsWithAmounts || recipientsWithAmounts.length === 0) {
        throw new Error('Recipients must be a non-empty array');
      }

      setLoading(true);

      const BATCH_SIZE =
        mint === undefined
          ? import.meta.env.VITE_SOL_TRANSFER_BATCH_SIZE
          : import.meta.env.VITE_SPL_TRANSFER_BATCH_SIZE;

      const uuid = uuidv4();
      const results: TransferResult[] = [];

      const signaturePayload: SignaturePayload = {
        signature: '',
        senderWallet: publicKey.toString(),
        status: 'error',
        error: 'Not initialized',
        errorMessage: '',
        tokenType: mint ? 'SOL' : 'SPL',
        timeStamp: generateTimeStamp(),
        tokenSymbol: mint || 'SOL',
        tokenMintAddress: mint || 'SOL',
        uuid: uuid,
        transactions: [],
      };

      try {
        updateMessage(t('Checking balances...'));

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

        updateMessage(t('Preparing recipient batches...'));

        const batches: Array<Array<{ recipient: string; amount: number }>> = [];
        for (
          let i = 0;
          i < formattedRecipients.length;
          i += Number(BATCH_SIZE)
        ) {
          // BATCH_SIZEを数値として確実に扱う
          const batchSize = Number(BATCH_SIZE);
          // 現在のバッチのインデックス範囲を計算
          const startIdx = i;
          const endIdx = Math.min(
            i + batchSize - 1,
            formattedRecipients.length - 1
          );

          // このバッチに含める受信者を取得
          const currentBatch = formattedRecipients.slice(startIdx, endIdx + 1);
          batches.push(currentBatch);
        }

        // バッチ作成の結果を検証
        const totalRecipients = batches.reduce(
          (sum, batch) => sum + batch.length,
          0
        );
        if (totalRecipients !== formattedRecipients.length) {
          console.error(
            `⚠️ バッチ分割エラー: 元の受信者数=${formattedRecipients.length}, バッチ後の受信者数=${totalRecipients}`
          );
        }

        console.log(
          `Split into ${batches.length} batches of max ${BATCH_SIZE} recipients each`
        );
        console.log(
          `合計: ${formattedRecipients.length}件 -> ${batches.length}バッチ (平均${(formattedRecipients.length / batches.length).toFixed(1)}件/バッチ)`
        );

        // デバッグ: バッチの詳細を出力
        console.log(`Total valid recipients: ${formattedRecipients.length}`);
        console.log(
          `Expected number of batches: ${Math.ceil(formattedRecipients.length / BATCH_SIZE)}`
        );
        console.log(`Actual number of batches created: ${batches.length}`);

        updateMessage(t('Creating transactions...'));

        const transactions: {
          transaction: VersionedTransaction;
          blockhash: string;
          lastValidBlockHeight: number;
        }[] = [];

        // すべてのバッチを順次処理
        await Promise.all(
          batches.map(
            (batch, batchIndex) =>
              new Promise<void>(async (resolve) => {
                // 各バッチを順番に遅延スタート（バッチごとに 1 秒遅延）
                await new Promise((r) =>
                  setTimeout(r, batchIndex * RPC_RATE_LIMIT)
                );

                try {
                  updateMessage(
                    t('Checking balances...') +
                      `[ ${batchIndex + 1}/${batches.length} ]`
                  );

                  console.log(
                    `[${batchIndex + 1}/${batches.length}] Processing batch with ${batch.length} recipients`
                  );

                  // バッチのトランザクション作成
                  const transaction = await createBatchTransferTransaction(
                    batch,
                    publicKey,
                    connection,
                    mint
                  );

                  console.log(
                    `[${batchIndex + 1}/${batches.length}] Transaction created with ${transaction.transaction.message.compiledInstructions.length} instructions`
                  );

                  transactions.push(transaction);
                } catch (error) {
                  console.error(
                    `Batch ${batchIndex + 1} transfer failed:`,
                    error
                  );
                }

                resolve();
              })
          )
        );

        // デバッグ: 作成されたトランザクション数を確認
        console.log(
          `Created ${transactions.length} transactions out of ${batches.length} batches`
        );

        // デバッグ: バッチとトランザクションの数に不一致がないか確認
        if (transactions.length < batches.length) {
          console.warn(
            `⚠️ Some batches did not create transactions: ${batches.length - transactions.length} missing`
          );
        }

        updateMessage(t('Waiting for wallet approval...'));
        console.log('Requesting wallet signature...');
        // 署名リクエスト前にトランザクション数を再確認
        console.log(
          `Requesting signatures for ${transactions.length} transactions...`
        );

        // ウォレット署名は一度に多数のトランザクションを処理できない可能性がある
        // 25件ずつに分割して処理する
        const MAX_SIGN_BATCH = 10;
        let allSignedTransactions: Transaction[] = [];

        for (let i = 0; i < transactions.length; i += MAX_SIGN_BATCH) {
          const batchToSign = transactions.slice(i, i + MAX_SIGN_BATCH);
          updateMessage(
            t('Signing batch...') +
              `[ ${Math.floor(i / MAX_SIGN_BATCH) + 1}/${Math.ceil(transactions.length / MAX_SIGN_BATCH)} ]`
          );

          console.log(
            `Signing batch ${i / MAX_SIGN_BATCH + 1}: ${batchToSign.length} transactions`
          );

          try {
            const signedBatch = await wallet.signAllTransactions(
              batchToSign.map((t) => t.transaction)
            );
            allSignedTransactions = [...allSignedTransactions, ...signedBatch];
            console.log(
              `Successfully signed batch ${i / MAX_SIGN_BATCH + 1}: got ${signedBatch.length} signatures`
            );
          } catch (error) {
            console.error(
              `Error signing batch ${i / MAX_SIGN_BATCH + 1}:`,
              error
            );
            throw error;
          }
        }

        console.log(
          `Total signed transactions: ${allSignedTransactions.length} of ${transactions.length} requested`
        );
        const signedTransactions = allSignedTransactions;

        console.log('Transaction signed successfully by wallet');
        updateMessage(t('Sending transactions to network...'));

        for (const [batchIndex, batch] of batches.entries()) {
          await (async () => {
            updateMessage(
              t('Sending transactions to network...') +
                `[ ${batchIndex + 1}/${batches.length} ]`
            );

            const signedTx = transactions[batchIndex];
            const signedTransaction = signedTransactions[batchIndex];
            const batchRecipients = batch.map((item) => item.recipient);
            let signature: string | undefined =
              signedTransaction.signatures[0].signature?.toString('base64');

            let transactionResult: TransferResult;

            try {
              console.log(
                `[${batchIndex + 1}/${batches.length}] Processing batch with ${batch.length} recipients`
              );

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
              updateMessage(
                t('Confirming transaction...') +
                  `[ ${batchIndex + 1}/${batches.length} ]`
              );

              const success = await waitForTransactionConfirmation(
                connection,
                signature,
                signedTx.blockhash,
                signedTx.lastValidBlockHeight
              );

              if (success) {
                const recipientAmounts = batch.map((item) => item.amount);

                transactionResult = {
                  error: '',
                  errorMessage: '',
                  signature: signature || '',
                  status: 'success',
                  timestamp: now,
                  recipients: batchRecipients,
                  amounts: recipientAmounts,
                } as TransferResult;

                console.log(
                  `Batch ${batchIndex + 1} confirmed successfully with ${batchRecipients.length} recipients`
                );
              } else {
                transactionResult = {
                  signature: signature || '',
                  status: 'error',
                  error: 'Transaction failed confirmation',
                  errorMessage: 'Failed to retrieve error details.',
                  timestamp: now,
                  recipients: batchRecipients,
                } as TransferResult;
              }

              updateMessage(
                t('Saving transaction data...') +
                  `[ ${batchIndex + 1}/${batches.length} ]`
              );

              signaturePayload.signature = transactionResult.signature;
              signaturePayload.senderWallet = publicKey.toString();
              signaturePayload.status = transactionResult.status;
              signaturePayload.error = transactionResult.error || '';
              signaturePayload.errorMessage =
                transactionResult.errorMessage || '';
              // tokenType -> 初期化時に設定済み
              // timeStamp -> 初期化時に設定済み
              signaturePayload.tokenSymbol = mint
                ? await getTokenSymbol(mint)
                : 'SOL';
              // tokenMintAddress -> 初期化時に設定済み
              // uuid -> 初期化時に設定済み

              signaturePayload.transactions = batch.map((item, index) => ({
                recipientWallet: item.recipient,
                amount: item.amount,
              }));

              await postSignatureData(signaturePayload);
            } catch (error) {
              if (error instanceof SendTransactionError) {
                console.log(`Batch ${batchIndex + 1} transfer failed:`, error);
              }

              let errorMessage: string | undefined = undefined;
              let status: 'error' | 'warn' = 'error';

              if (error instanceof Error) {
                errorMessage = error.message;

                if (error.message.includes('TokenInvalidAccountOwner')) {
                  errorMessage = `Invalid token account owner. This token may not exist on the current network (${getNetworkName(connection.rpcEndpoint)}). Try switching networks.`;
                } else if (error.message.includes('TokenInvalidMint')) {
                  errorMessage =
                    'Invalid token mint address. Please verify the token address.';
                } else if (error.message.includes('Transaction too large')) {
                  errorMessage =
                    'Transaction size exceeded limit. Try sending fewer recipients per batch.';
                } else if (error.message.includes('MultiSenderServerError')) {
                  status = 'warn';
                  errorMessage =
                    'データをサーバーに保存できませんでした。\nHistoryページは反映されません。ご使用のWalletアプリ等でご確認ください。';
                }
              }

              transactionResult = {
                signature: signature || '',
                status,
                errorMessage:
                  error instanceof Error ? error.message : String(error),
                error: errorMessage || 'Transfer failed',
                timestamp: now,
                recipients: batchRecipients,
                signaturePayload,
              } as TransferResult;
            }

            results.push(transactionResult);
          })();

          // RPC_RATE_LIMITミリ秒待機
          if (batchIndex < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, RPC_RATE_LIMIT));
          }
        }

        updateMessage(t('Processing completed successfully'));
        console.log(`Transfer operation completed. Results:`, results);
        return {
          result: results,
          uuid: uuid,
        };
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
            updateMessage(t('Transaction cancelled by user'));
            console.log('User cancelled transaction');
            results.push({
              signature: '',
              status: 'error',
              error: 'Transaction cancelled by user',
              errorMessage: error.message,
              timestamp: now,
              recipients: [],
            });
          } else {
            updateMessage(t('Error occurred during processing'));
            throw error;
          }
        } else {
          updateMessage(t('Unknown error occurred'));
          throw error;
        }
      } finally {
        setLoading(false);
      }

      return {
        result: results,
        uuid: uuidv4(),
      };
    },
    [connection, publicKey, getTokenSymbol, updateMessage]
  );

  return {
    transferWithIndividualAmounts, // 新しいメソッドとして公開
    loading,
  };
}
