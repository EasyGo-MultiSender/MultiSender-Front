import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMint,
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
} from '@solana/spl-token';
import {
  PublicKey,
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage,
  SendTransactionError,
} from '@solana/web3.js';
import { useState, useCallback } from 'react';

const BATCH_SIZE = Number(import.meta.env.VITE_TRANSFER_BATCH_SIZE) || 9;
const TRANSACTION_TIMEOUT = 120000; // 120秒のタイムアウト

interface TransferParams {
  recipients: string[];
  amount: number;
  mint?: string;
}

interface TransferResult {
  signature: string;
  status: 'success' | 'error';
  error?: string;
  timestamp: number;
  recipients: string[];
}

// ネットワーク名を取得する関数
function getNetworkName(rpcEndpoint: string): string {
  if (rpcEndpoint.includes('devnet')) return 'Devnet';
  if (rpcEndpoint.includes('testnet')) return 'Testnet';
  return 'Mainnet Beta';
}

export function useTokenTransfer(
  connection: Connection,
  publicKey: PublicKey | null
) {
  const [loading, setLoading] = useState(false);

  // RPCエンドポイントとネットワーク情報のロギング
  const logConnectionInfo = useCallback(async () => {
    try {
      console.log(`Current RPC endpoint: ${connection.rpcEndpoint}`);
      console.log(
        `Network appears to be: ${getNetworkName(connection.rpcEndpoint)}`
      );

      // 接続確認
      const blockHeight = await connection.getBlockHeight();
      console.log(`Connection verified, current block height: ${blockHeight}`);
      return true;
    } catch (error) {
      console.error('Failed to verify RPC connection:', error);
      return false;
    }
  }, [connection]);

  // Mintアドレスの検証関数
  const validateMintAddress = useCallback(
    async (mintAddress: string): Promise<boolean> => {
      try {
        const mintPubkey = new PublicKey(mintAddress);

        // アカウント情報の取得
        const mintAccountInfo = await connection.getAccountInfo(mintPubkey);

        if (!mintAccountInfo) {
          console.error(
            `Mint account not found on current network: ${mintAddress}`
          );
          throw new Error(
            `The token (${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}) was not found on the current network (${getNetworkName(connection.rpcEndpoint)}). Please check your network selection.`
          );
        }

        // トークンプログラムIDの確認
        const isValidOwner =
          mintAccountInfo.owner.equals(TOKEN_PROGRAM_ID) ||
          mintAccountInfo.owner.equals(TOKEN_2022_PROGRAM_ID);

        if (!isValidOwner) {
          console.error(
            `Invalid mint account owner: ${mintAccountInfo.owner.toBase58()}`
          );
          throw new Error(
            `The specified address is not a valid token mint on the current network (${getNetworkName(connection.rpcEndpoint)}). Please verify the token mint address.`
          );
        }

        console.log(
          `Mint account validated: ${mintAddress}, owner: ${mintAccountInfo.owner.toBase58()}`
        );
        return true;
      } catch (error) {
        if (error instanceof Error) {
          throw error; // 既にフォーマット済みのエラーはそのまま投げる
        }
        console.error('Error validating mint address:', error);
        throw new Error(`Invalid token mint address: ${mintAddress}`);
      }
    },
    [connection]
  );

  // バッチトランザクションの作成 - 各受取人の個別金額を扱えるように修正
  const createBatchTransferTransaction = useCallback(
    async (
      recipientsWithAmounts: Array<{ recipient: string; amount: number }>,
      fromPubkey: PublicKey,
      mintAddress?: string
    ) => {
      // RPC接続の確認
      await logConnectionInfo();

      const instructions = [];

      if (!mintAddress) {
        // SOL transfers - 各受取人に個別の金額を送金
        for (const { recipient, amount } of recipientsWithAmounts) {
          try {
            const toPubkey = new PublicKey(recipient);
            instructions.push(
              SystemProgram.transfer({
                fromPubkey,
                toPubkey,
                lamports: Math.round(amount * LAMPORTS_PER_SOL),
              })
            );
          } catch (e) {
            console.error(`Error preparing SOL transfer to ${recipient}:`, e);
            throw new Error(`Invalid recipient address: ${recipient}`);
          }
        }
      } else {
        // SPL Token transfers - まずmintアドレスの検証
        try {
          await validateMintAddress(mintAddress);

          const mintPubkey = new PublicKey(mintAddress);

          // トークンのメタデータを取得（特にデシマル値）
          console.log(`Getting mint info for: ${mintAddress}`);
          const mintInfo = await getMint(connection, mintPubkey);
          const tokenDecimals = mintInfo.decimals;
          console.log(
            `Token decimals: ${tokenDecimals}, program ID: ${mintInfo.mintAuthority ? mintInfo.mintAuthority.toBase58() : 'None'}`
          );

          const fromTokenAccount = await getAssociatedTokenAddress(
            mintPubkey,
            fromPubkey
          );

          // 送信元アカウント確認
          const fromTokenAccountInfo =
            await connection.getAccountInfo(fromTokenAccount);
          if (!fromTokenAccountInfo) {
            throw new Error(
              `You don't have an associated token account for this token (${mintAddress.slice(0, 6)}...${mintAddress.slice(-4)}). Please check if you own this token.`
            );
          }

          // 各受取人に個別の金額を送金
          for (const { recipient, amount } of recipientsWithAmounts) {
            const toPubkey = new PublicKey(recipient);
            const toTokenAccount = await getAssociatedTokenAddress(
              mintPubkey,
              toPubkey
            );

            // 受取人のトークンアカウントが存在するか確認
            const toTokenAccountInfo =
              await connection.getAccountInfo(toTokenAccount);

            if (!toTokenAccountInfo) {
              // アカウントが存在しない場合は作成
              instructions.push(
                createAssociatedTokenAccountInstruction(
                  fromPubkey,
                  toTokenAccount,
                  toPubkey,
                  mintPubkey
                )
              );
            }

            // 受取人ごとの金額を使用して計算
            const tokenAmount = BigInt(
              Math.round(amount * Math.pow(10, tokenDecimals))
            );

            instructions.push(
              createTransferInstruction(
                fromTokenAccount,
                toTokenAccount,
                fromPubkey,
                tokenAmount
              )
            );
          }
        } catch (error) {
          console.error(`Error preparing token transfer:`, error);
          throw error;
        }
      }

      if (instructions.length === 0) {
        throw new Error('No valid transfer instructions could be created.');
      }

      // 最新のブロックハッシュを取得
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash('confirmed');

      const messageV0 = new TransactionMessage({
        payerKey: fromPubkey,
        recentBlockhash: blockhash,
        instructions,
      }).compileToV0Message();

      const transaction = new VersionedTransaction(messageV0);

      return { transaction, blockhash, lastValidBlockHeight };
    },
    [connection, logConnectionInfo, validateMintAddress]
  );

  // トランザクションの確認を待機する関数
  const waitForTransactionConfirmation = async (
    connection: Connection,
    signature: string,
    blockhash: string,
    lastValidBlockHeight: number
  ): Promise<boolean> => {
    const startTime = Date.now();
    console.log(`Waiting for confirmation of transaction ${signature}`);

    const POLLING_INTERVAL = 1000;

    while (Date.now() - startTime < TRANSACTION_TIMEOUT) {
      try {
        const confirmation = await connection.confirmTransaction(
          {
            signature,
            blockhash,
            lastValidBlockHeight,
          },
          'confirmed'
        );

        if (confirmation.value.err === null) {
          console.log(`Transaction ${signature} confirmed successfully`);
          return true;
        }

        if (confirmation.value.err) {
          console.error(
            `Transaction ${signature} failed with error:`,
            confirmation.value.err
          );
          return false;
        }
      } catch (error) {
        console.warn(
          `Confirmation check failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }

      await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
    }

    console.error(`Transaction ${signature} confirmation timed out`);
    throw new Error(`Transaction confirmation timed out`);
  };

  // ウォレットを取得する関数
  const getWalletAdapter = useCallback(() => {
    // 利用可能なウォレット候補を、型を明示したオブジェクトの配列で管理

    const possibleWallets = [
      window.phantom?.solana,
      window.solflare,
      window.solana,
      window.xnft?.solana,
    ];

    // 最初に見つかった有効なウォレットを使用
    for (const wallet of possibleWallets) {
      if (wallet && typeof wallet.signTransaction === 'function') {
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
  }, []);

  // 送金処理のメイン関数 - 受取人と金額のペアを適切にバッチ処理するように修正
  const transfer = useCallback(
    async (params: TransferParams): Promise<TransferResult[]> => {
      if (!publicKey) throw new Error('Wallet not connected');

      if (
        !params.recipients ||
        !Array.isArray(params.recipients) ||
        params.recipients.length === 0
      ) {
        throw new Error('Recipients must be a non-empty array');
      }

      setLoading(true);
      const results: TransferResult[] = [];

      try {
        const { recipients, amount, mint } = params;
        console.log(
          `Starting transfer: ${recipients.length} recipients, amount: ${amount}, mint: ${mint || 'SOL'}`
        );

        // ネットワーク接続確認
        const connectionOk = await logConnectionInfo();
        if (!connectionOk) {
          throw new Error(
            `Unable to connect to ${getNetworkName(connection.rpcEndpoint)} network. Please check your internet connection or try a different RPC endpoint.`
          );
        }

        // ウォレットアダプタを事前に取得して検証
        const wallet = getWalletAdapter();
        if (!wallet || typeof wallet.signTransaction !== 'function') {
          throw new Error(
            'Your wallet does not support transaction signing. Please use Phantom or Solflare wallet.'
          );
        }

        // 受取人とその金額のリストを構築
        const recipientsWithAmounts = recipients.map((recipient) => ({
          recipient,
          amount, // 全員同じ金額の場合
        }));

        // バッチに分割 - 最大BATCH_SIZE件ずつ
        const batches: Array<Array<{ recipient: string; amount: number }>> = [];
        for (let i = 0; i < recipientsWithAmounts.length; i += BATCH_SIZE) {
          batches.push(recipientsWithAmounts.slice(i, i + BATCH_SIZE));
        }
        console.log(
          `Split into ${batches.length} batches of max ${BATCH_SIZE} recipients each`
        );

        // 各バッチを順次処理
        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const batchRecipients = batch.map((item) => item.recipient);
          let signature = '';

          try {
            console.log(
              `Processing batch ${batchIndex + 1}/${batches.length} with ${batch.length} recipients`
            );

            // バッチのトランザクション作成 - 個別の金額を含める
            const { transaction, blockhash, lastValidBlockHeight } =
              await createBatchTransferTransaction(
                batch, // 受取人と金額のペアの配列
                publicKey,
                mint
              );

            console.log(
              `Transaction created for batch ${batchIndex + 1} with ${batch.length} recipients`
            );
            console.log('Requesting wallet signature...');

            try {
              // 署名リクエスト - ここでApproveボタンが表示される
              const signedTx = await wallet.signTransaction(transaction);
              console.log('Transaction signed successfully by wallet');

              // 署名されたトランザクションを送信
              console.log('Sending signed transaction to network...');
              signature = await connection.sendTransaction(signedTx, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 3,
              });

              console.log(`Transaction sent with signature: ${signature}`);

              // 送信したトランザクションの確認を待機
              const success = await waitForTransactionConfirmation(
                connection,
                signature,
                blockhash,
                lastValidBlockHeight
              );

              if (success) {
                // 成功した場合、このバッチのすべての受取人を結果に追加
                results.push({
                  signature,
                  status: 'success',
                  timestamp: Date.now(),
                  recipients: batchRecipients,
                });
                console.log(
                  `Batch ${batchIndex + 1} transaction confirmed successfully: ${signature}`
                );
              } else {
                // 失敗した場合、エラーとして記録
                results.push({
                  signature,
                  status: 'error',
                  error: 'Transaction failed confirmation',
                  timestamp: Date.now(),
                  recipients: batchRecipients,
                });
                console.log(
                  `Batch ${batchIndex + 1} transaction failed confirmation: ${signature}`
                );
              }
            } catch (signError) {
              if (signError instanceof Error) {
                // ユーザーによる拒否を検出
                if (
                  signError.message?.includes('User rejected') ||
                  signError.message?.includes('Transaction rejected') ||
                  signError.message?.includes('cancelled') ||
                  signError.message?.includes('canceled') ||
                  // Phantomウォレット特有のエラーメッセージ
                  signError.message?.includes('user rejected') ||
                  signError.message?.includes('request timed out')
                ) {
                  console.log('User cancelled transaction');
                  results.push({
                    signature: '',
                    status: 'error',
                    error: 'Transaction cancelled by user',
                    timestamp: Date.now(),
                    recipients: batchRecipients,
                  });

                  // ユーザーがキャンセルした場合は残りのバッチを中止
                  console.log(
                    'User cancelled transaction, stopping further processing'
                  );
                  break;
                } else {
                  console.error('Error during transaction signing:', signError);
                  throw new Error(
                    `Failed to sign transaction: ${signError.message || 'Unknown wallet error'}`
                  );
                }
              }
            }
          } catch (error) {
            console.error(`Batch ${batchIndex + 1} transfer failed:`, error);

            // エラーメッセージをユーザーフレンドリーに
            let errorMessage = 'Transfer failed';

            if (error instanceof Error) {
              errorMessage = error.message;

              // よくあるエラーパターンを検出してより明確なメッセージに変換
              if (error.message.includes('TokenInvalidAccountOwner')) {
                const networkName = getNetworkName(connection.rpcEndpoint);
                errorMessage = `Invalid token account owner. This token may not exist on the current network (${networkName}). Try switching networks.`;
              } else if (error.message.includes('TokenInvalidMint')) {
                errorMessage =
                  'Invalid token mint address. Please verify the token address.';
              } else if (error.message.includes('TokenAccountNotFound')) {
                errorMessage =
                  'Token account not found. The recipient may not have an account for this token yet.';
              } else if (error.message.includes('insufficient funds')) {
                errorMessage =
                  'Insufficient funds for transaction. Please check your balance.';
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
            console.log(`Waiting before processing next batch...`);
            await new Promise((resolve) => setTimeout(resolve, 2000));
          }
        }

        console.log(`Transfer operation completed. Results:`, results);
        return results;
      } catch (error) {
        console.error('Transfer operation failed:', error);

        // メイン処理のエラーを処理
        let errorMessage =
          'Transfer operation failed due to an unexpected error';
        if (error instanceof Error) {
          errorMessage = error.message;
        }

        throw new Error(errorMessage);
      } finally {
        setLoading(false);
      }
    },
    [
      connection,
      publicKey,
      createBatchTransferTransaction,
      getWalletAdapter,
      logConnectionInfo,
    ]
  );

  // Sender.tsxからの呼び出し用に、個別の金額を持つ受取人のバッチ処理を提供
  const transferWithIndividualAmounts = useCallback(
    async (
      recipientsWithAmounts: Array<{ address: string; amount: number }>,
      mint?: string
    ): Promise<TransferResult[]> => {
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
              mint
            );

            console.log(
              `Transaction created with ${transaction.transaction.message.compiledInstructions.length} instructions`
            );
            console.log('Requesting wallet signature...');

            transactions.push(transaction);
          } catch (error) {
            console.error(`Batch ${batchIndex + 1} transfer failed:`, error);
          }
        }

        const signedTransactions = await wallet.signAllTransactions(
          transactions.map((t) => t.transaction)
        );
        console.log('Transaction signed successfully by wallet');

        for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
          const batch = batches[batchIndex];
          const signedTx = transactions[batchIndex];
          const signedTransaction = signedTransactions[batchIndex];
          const batchRecipients = batch.map((item) => item.recipient);
          let signature = signedTransactions[batchIndex].signatures[0];

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
                signature,
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
                signature,
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
    [
      connection,
      publicKey,
      createBatchTransferTransaction,
      getWalletAdapter,
      logConnectionInfo,
    ]
  );

  return {
    transfer,
    transferWithIndividualAmounts, // 新しいメソッドとして公開
    loading,
    getNetworkName: () => getNetworkName(connection.rpcEndpoint),
  };
}
