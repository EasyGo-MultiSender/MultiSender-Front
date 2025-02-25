import { useState, useCallback } from 'react';
import { 
  PublicKey, 
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage,
  SendTransactionError
} from '@solana/web3.js';
import { 
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getMint
} from '@solana/spl-token';

const BATCH_SIZE = Number(import.meta.env.VITE_TRANSFER_BATCH_SIZE) || 9;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1秒間のリトライ遅延
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

export function useTokenTransfer(connection: Connection, publicKey: PublicKey | null) {
  const [loading, setLoading] = useState(false);

  const createBatchTransferInstructions = useCallback(async (
    recipients: string[],
    amount: number,
    fromPubkey: PublicKey,
    mintAddress?: string
  ) => {
    const instructions = [];

    if (!mintAddress) {
      // SOL transfers
      for (const recipient of recipients) {
        const toPubkey = new PublicKey(recipient);
        instructions.push(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports: Math.round(amount * LAMPORTS_PER_SOL)
          })
        );
      }
    } else {
      // SPL Token transfers
      const mintPubkey = new PublicKey(mintAddress);
      
      // トークンのメタデータを取得（特にデシマル値）
      const mintInfo = await getMint(connection, mintPubkey);
      const tokenDecimals = mintInfo.decimals;
      console.log(`Token decimals for ${mintAddress}: ${tokenDecimals}`);
      
      const fromTokenAccount = await getAssociatedTokenAddress(
        mintPubkey,
        fromPubkey
      );

      for (const recipient of recipients) {
        const toPubkey = new PublicKey(recipient);
        const toTokenAccount = await getAssociatedTokenAddress(
          mintPubkey,
          toPubkey
        );

        // 受取人のトークンアカウントが存在するか確認
        const toTokenAccountInfo = await connection.getAccountInfo(toTokenAccount);
        
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

        // 正確なデシマル値を使用して金額を計算
        const tokenAmount = BigInt(Math.round(amount * Math.pow(10, tokenDecimals)));
        console.log(`Transfer amount in raw units: ${tokenAmount}`);

        instructions.push(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            fromPubkey,
            tokenAmount
          )
        );
      }
    }

    return instructions;
  }, [connection]);

  const createAndSignBatchTransaction = async (
    batchRecipients: string[],
    amount: number,
    fromPubkey: PublicKey,
    mint?: string
  ): Promise<VersionedTransaction> => {
    const instructions = await createBatchTransferInstructions(
      batchRecipients,
      amount,
      fromPubkey,
      mint
    );

    // 最新のブロックハッシュを取得（finalized ではなく confirmed を使用）
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
    console.log(`Using blockhash: ${blockhash}, lastValidBlockHeight: ${lastValidBlockHeight}`);

    const messageV0 = new TransactionMessage({
      payerKey: fromPubkey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    // 明示的にlastValidBlockHeightをプロパティとして追加
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    return transaction;
  };

  /**
   * トランザクションの確認を待機する関数
   * @param connection Solana RPC接続
   * @param signature トランザクションのシグネチャ
   * @param blockhash 使用したブロックハッシュ
   * @param lastValidBlockHeight 有効な最後のブロック高
   * @returns 確認が成功したかどうかを示すブール値
   */
  const waitForTransactionConfirmation = async (
    connection: Connection, 
    signature: string, 
    blockhash: string,
    lastValidBlockHeight: number
  ): Promise<boolean> => {
    const startTime = Date.now();
    console.log(`Waiting for confirmation of transaction ${signature}`);
    
    // ステータスポーリングの間隔 (ミリ秒)
    const POLLING_INTERVAL = 1000;
    
    // 最初にトランザクションのステータスを確認
    try {
      const status = await connection.getSignatureStatus(signature);
      if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
        console.log(`Transaction ${signature} already confirmed with status: ${status.value.confirmationStatus}`);
        return true;
      }
    } catch (error) {
      console.warn(`Initial signature status check failed: ${error instanceof Error ? error.message : String(error)}`);
      // 初期確認に失敗しても続行
    }

    // 確認を待機するメインループ
    while (Date.now() - startTime < TRANSACTION_TIMEOUT) {
      try {
        console.log(`Checking confirmation status for ${signature} (elapsed: ${(Date.now() - startTime) / 1000}s)`);
        
        // 方法1: confirmTransaction を使用
        try {
          const confirmation = await connection.confirmTransaction({
            signature,
            blockhash,
            lastValidBlockHeight
          }, 'confirmed');
          
          if (confirmation.value.err === null) {
            console.log(`Transaction ${signature} confirmed successfully via confirmTransaction`);
            return true;
          }
          
          if (confirmation.value.err) {
            console.error(`Transaction ${signature} failed with error:`, confirmation.value.err);
            return false;
          }
        } catch (confirmError) {
          console.warn(`confirmTransaction check failed: ${confirmError instanceof Error ? confirmError.message : String(confirmError)}`);
          // confirmTransactionに失敗した場合は他の方法を試す
          // ブロックハイト超過エラーの場合は再試行
          if (confirmError instanceof Error && confirmError.message.includes('BlockheightExceeded')) {
            console.log('Block height exceeded, but transaction might still be valid. Checking signature status...');
          } else if (!(confirmError instanceof Error && confirmError.message.includes('Transaction'))) {
            // トランザクション関連エラー以外は再スロー
            throw confirmError;
          }
        }
        
        // 方法2: getSignatureStatus を使用して直接ステータスを確認
        try {
          const status = await connection.getSignatureStatus(signature);
          
          if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
            console.log(`Transaction ${signature} confirmed with status: ${status.value.confirmationStatus}`);
            return true;
          }
          
          if (status?.value?.err) {
            console.error(`Transaction ${signature} failed with error:`, status.value.err);
            return false;
          }
          
          console.log(`Current status: ${status?.value?.confirmationStatus || 'not found'}`);
        } catch (statusError) {
          console.warn(`getSignatureStatus check failed: ${statusError instanceof Error ? statusError.message : String(statusError)}`);
        }
        
        // 方法3: getParsedTransaction を使用して詳細情報を取得
        try {
          const parsedTx = await connection.getParsedTransaction(signature, 'confirmed');
          if (parsedTx) {
            console.log(`Transaction ${signature} found in ledger with status: confirmed`);
            return true;
          }
        } catch (parsedTxError) {
          console.warn(`getParsedTransaction check failed: ${parsedTxError instanceof Error ? parsedTxError.message : String(parsedTxError)}`);
        }
        
        // 一定時間待機してから再試行
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      } catch (error) {
        console.error(`Unexpected error during confirmation check: ${error instanceof Error ? error.message : String(error)}`);
        
        // 一般的なエラーの場合も続行し再試行
        await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
      }
    }

    // タイムアウト
    const timeoutSeconds = TRANSACTION_TIMEOUT / 1000;
    console.error(`Transaction ${signature} confirmation timed out after ${timeoutSeconds} seconds`);
    throw new Error(`Transaction confirmation timed out after ${timeoutSeconds} seconds`);
  };

  // ウォレットアダプタを取得するヘルパー関数
  const getWalletAdapter = useCallback(() => {
    // 複数のウォレット変数を試行
    const wallet = 
      window.xnft?.solana ?? 
      window.phantom?.solana ?? 
      (window as any).solana ?? 
      (window as any).solflare;
    
    // @solana/wallet-adapter-react のアダプタを確認
    if (!wallet) {
      // WalletMultiButtonが使用されていればそちらを優先
      const walletMultiButton = document.querySelector('.wallet-adapter-button');
      if (walletMultiButton) {
        throw new Error('Please use the Wallet Connect button in the header to reconnect your wallet');
      } else {
        throw new Error('Wallet adapter not found. Please refresh the page and try again');
      }
    }
    
    return wallet;
  }, []);

  const transfer = useCallback(async (params: TransferParams): Promise<TransferResult[]> => {
    if (!publicKey) throw new Error('Wallet not connected');
    
    if (!params.recipients || !Array.isArray(params.recipients) || params.recipients.length === 0) {
      throw new Error('Recipients must be a non-empty array');
    }

    setLoading(true);
    const results: TransferResult[] = [];
    
    try {
      const { recipients, amount, mint } = params;
      console.log(`Starting transfer: ${recipients.length} recipients, ${amount} tokens, mint: ${mint || 'SOL'}`);

      // バッチに分割
      const batches: string[][] = [];
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        batches.push(recipients.slice(i, i + BATCH_SIZE));
      }
      console.log(`Split into ${batches.length} batches of max ${BATCH_SIZE} recipients each`);

      // 各バッチを順次処理
      for (let i = 0; i < batches.length; i++) {
        const batchRecipients = batches[i];
        console.log(`Processing batch ${i+1}/${batches.length} with ${batchRecipients.length} recipients`);
        
        let retries = 0;
        let success = false;
        let signature = '';

        while (retries < MAX_RETRIES && !success) {
          try {
            // 毎回新しいトランザクションを作成（特にリトライ時に重要）
            console.log(`Attempt ${retries+1}: Creating transaction`);
            const tx = await createAndSignBatchTransaction(
              batchRecipients,
              amount,
              publicKey,
              mint
            );

            // ウォレットアダプタの取得
            const wallet = getWalletAdapter();
            
            if (!wallet.signAllTransactions || typeof wallet.signAllTransactions !== 'function') {
              console.error('Wallet does not support signAllTransactions', wallet);
              throw new Error('Your wallet does not support the required signing method');
            }

            // トランザクションに署名 - タイムアウトの除去
            console.log(`Attempt ${retries+1}: Signing transaction with wallet`, wallet.isConnected ? 'connected' : 'disconnected');
            
            // タイムアウトなしで直接署名を試行
            try {
              // 署名のためのポップアップが表示される前に少し待機
              await new Promise(resolve => setTimeout(resolve, 500));
              
              // ユーザーに署名ダイアログが表示されていることを知らせる
              console.log('Waiting for wallet approval. Please check your wallet extension for approval request...');
              
              // 通常の署名処理を実行
              const signedTransactions = await wallet.signAllTransactions([tx]);
              
              if (!signedTransactions || signedTransactions.length === 0) {
                throw new Error('Wallet returned empty signed transactions array');
              }
              
              const signedTx = signedTransactions[0];
              console.log(`Transaction signed successfully!`);
              
              // トランザクション送信
              console.log(`Attempt ${retries+1}: Sending transaction`);
              signature = await connection.sendTransaction(signedTx, {
                skipPreflight: false,
                preflightCommitment: 'confirmed',
                maxRetries: 3
              });

              console.log(`Transaction sent: ${signature}`);

              // 送信したトランザクションの確認を待機
              console.log(`Waiting for confirmation`);
              success = await waitForTransactionConfirmation(
                connection, 
                signature, 
                signedTx.message.recentBlockhash,
                signedTx.lastValidBlockHeight
              );

              if (success) {
                console.log(`Transaction confirmed successfully!`);
                results.push({
                  signature,
                  status: 'success',
                  timestamp: Date.now(),
                  recipients: batchRecipients
                });
                break;
              }
            } catch (signError) {
              console.error('Signing error:', signError);
              
              // ウォレット関連のエラーメッセージをより具体的に
              if (signError instanceof Error) {
                if (signError.message.includes('User rejected')) {
                  throw new Error('Transaction was rejected by user in wallet');
                } else if (signError.message.includes('timeout') || signError.message.includes('Timed out')) {
                  throw new Error('Wallet approval timed out. Please check your wallet extension and try again');
                }
              }
              
              // その他のエラーは再スロー
              throw signError;
            }
          } catch (error) {
            console.error(`Attempt ${retries+1} failed:`, error);
            
            if (error instanceof SendTransactionError) {
              console.error('SendTransactionError details:', error.message);
              // シグネチャが存在する場合はログを取得
              if (signature) {
                try {
                  console.log(`Fetching logs for failed transaction ${signature}`);
                  const txInfo = await connection.getTransaction(signature, {
                    commitment: 'confirmed',
                    maxSupportedTransactionVersion: 0
                  });
                  console.error('Transaction info:', txInfo);
                } catch (logError) {
                  console.error('Failed to fetch transaction logs:', logError);
                }
              }
            }
            
            retries++;
            
            if (retries < MAX_RETRIES) {
              console.log(`Retrying in ${RETRY_DELAY}ms...`);
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
            } else {
              console.error(`All ${MAX_RETRIES} attempts failed`);
            }
          }
        }

        // リトライしても失敗した場合
        if (!success) {
          console.error(`Failed to process batch ${i+1} after ${MAX_RETRIES} attempts`);
          results.push({
            signature: signature || '',
            status: 'error',
            error: 'Failed to confirm transaction after multiple attempts',
            timestamp: Date.now(),
            recipients: batchRecipients
          });
        }

        // バッチ間の遅延
        if (i < batches.length - 1) {
          console.log(`Waiting 1 second before processing next batch`);
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }

      console.log(`Transfer operation completed. Results:`, results);
      return results;
    } catch (error) {
      console.error('Transfer operation failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, createBatchTransferInstructions, getWalletAdapter]);

  return {
    transfer,
    loading
  };
}