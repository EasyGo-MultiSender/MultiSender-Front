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

const BATCH_SIZE = Number(import.meta.env.VITE_TRANSFER_BATCH_SIZE) || 9;
const RPC_RATE_LIMIT = Number(import.meta.env.VITE_RPC_RATE_LIMIT) || 1000;

export function useTokenTransfer(
  connection: Connection,
  publicKey: PublicKey | null
) {
  const [loading, setLoading] = useState(false);
  const { fetchMetadata } = useTokenMetadata(connection);

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
      mint?: string
    ): Promise<{ result: TransferResult[]; uuid: string }> => {
      console.warn('transferWithIndividualAmounts');
      if (!publicKey) throw new Error('Wallet not connected');

      if (!recipientsWithAmounts || recipientsWithAmounts.length === 0) {
        throw new Error('Recipients must be a non-empty array');
      }

      setLoading(true);
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

        console.log('Requesting wallet signature...');
        const signedTransactions: Transaction[] =
          await wallet.signAllTransactions(
            transactions.map((t) => t.transaction)
          );
        console.log('Transaction signed successfully by wallet');

        for (const [batchIndex, batch] of batches.entries()) {
          await (async () => {
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
                  timestamp: Date.now(),
                  recipients: batchRecipients,
                  amounts: recipientAmounts,
                };

                console.log(
                  `Batch ${batchIndex + 1} confirmed successfully with ${batchRecipients.length} recipients`
                );
              } else {
                transactionResult = {
                  signature: signature || '',
                  status: 'error',
                  error: 'Transaction failed confirmation',
                  errorMessage: 'Failed to retrieve error details.',
                  timestamp: Date.now(),
                  recipients: batchRecipients,
                };
              }

              results.push(transactionResult);

              signaturePayload.signature = transactionResult.signature;
              signaturePayload.senderWallet = publicKey.toString();
              signaturePayload.status = transactionResult.status;
              signaturePayload.error = '調整中';
              signaturePayload.errorMessage = transactionResult.error || '';
              // tokenType -> 初期化時に設定済み
              // timeStamp -> 初期化時に設定済み
              signaturePayload.tokenSymbol = mint
                ? await getTokenSymbol(mint)
                : 'SOL';
              // tokenMintAddress -> 初期化時に設定済み
              // uuid -> 初期化時に設定済み
              signaturePayload.transactions = results.map((result) => ({
                recipientWallet: result.recipients[0],
                amount: result.amounts ? result.amounts[0] : 0,
              }));
              await postSignatureData(signaturePayload);
            } catch (error) {
              if (error instanceof SendTransactionError) {
                console.log(`Batch ${batchIndex + 1} transfer failed:`, error);
              }

              let errorMessage = 'Transfer failed';

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
                }
              }

              results.push({
                signature: signature || '',
                status: 'error',
                errorMessage: errorMessage,
                error: errorMessage,
                timestamp: Date.now(),
                recipients: batchRecipients,
              });
            }
          })();

          // RPC_RATE_LIMITミリ秒待機
          if (batchIndex < batches.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, RPC_RATE_LIMIT));
          }
        }

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
            console.log('User cancelled transaction');
            results.push({
              signature: '',
              status: 'error',
              error: 'Transaction cancelled by user',
              errorMessage: error.message,
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

      return {
        result: results,
        uuid: uuidv4(),
      };
    },
    [connection, publicKey, getTokenSymbol]
  );

  return {
    transferWithIndividualAmounts, // 新しいメソッドとして公開
    loading,
  };
}
