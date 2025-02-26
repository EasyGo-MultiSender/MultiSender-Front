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

  // バッチトランザクションの作成
  const createBatchTransferTransaction = useCallback(async (
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

    // 最新のブロックハッシュを取得
    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');

    const messageV0 = new TransactionMessage({
      payerKey: fromPubkey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();

    const transaction = new VersionedTransaction(messageV0);
    transaction.lastValidBlockHeight = lastValidBlockHeight;
    
    return { transaction, blockhash, lastValidBlockHeight };
  }, [connection]);

  // トランザクションの確認を待機する関数（以前のコードと同じ）
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
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, 'confirmed');
        
        if (confirmation.value.err === null) {
          console.log(`Transaction ${signature} confirmed successfully`);
          return true;
        }
        
        if (confirmation.value.err) {
          console.error(`Transaction ${signature} failed with error:`, confirmation.value.err);
          return false;
        }
      } catch (error) {
        console.warn(`Confirmation check failed: ${error instanceof Error ? error.message : String(error)}`);
      }
      
      await new Promise(resolve => setTimeout(resolve, POLLING_INTERVAL));
    }

    console.error(`Transaction ${signature} confirmation timed out`);
    throw new Error(`Transaction confirmation timed out`);
  };

  // ウォレットアダプタを取得するヘルパー関数（以前のコードと同じ）
  const getWalletAdapter = useCallback(() => {
    const wallet = 
      window.xnft?.solana ?? 
      window.phantom?.solana ?? 
      (window as any).solana ?? 
      (window as any).solflare;
    
    if (!wallet) {
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
      for (const batchRecipients of batches) {
        let userCancelled = false;
        let signature = '';
  
        try {
          // バッチのトランザクション作成
          const { transaction, blockhash, lastValidBlockHeight } = await createBatchTransferTransaction(
            batchRecipients,
            amount,
            publicKey,
            mint
          );
  
          // ウォレットアダプタの取得
          const wallet = getWalletAdapter();
          
          if (!wallet.signTransaction || typeof wallet.signTransaction !== 'function') {
            throw new Error('Your wallet does not support the required signing method');
          }
  
          // バッチトランザクションに署名
          try {
            const signedTx = await wallet.signTransaction(transaction);
  
            // トランザクション送信
            signature = await connection.sendTransaction(signedTx, {
              skipPreflight: false,
              preflightCommitment: 'confirmed',
              maxRetries: 3
            });
  
            // 送信したトランザクションの確認を待機
            const success = await waitForTransactionConfirmation(
              connection, 
              signature, 
              blockhash,
              lastValidBlockHeight
            );
  
            if (success) {
              results.push({
                signature,
                status: 'success',
                timestamp: Date.now(),
                recipients: batchRecipients
              });
            } else {
              results.push({
                signature,
                status: 'error',
                error: 'Transaction failed confirmation',
                timestamp: Date.now(),
                recipients: batchRecipients
              });
            }
          } catch (signError: any) {
            // ユーザーによる拒否を検出
            if (signError.message.includes('User rejected') || 
                signError.message.includes('Transaction rejected')) {
              console.log('User cancelled transaction');
              userCancelled = true;
              results.push({
                signature: '',
                status: 'error',
                error: 'Transaction cancelled by user',
                timestamp: Date.now(),
                recipients: batchRecipients
              });
            } else {
              throw signError;
            }
          }
  
          // ユーザーによるキャンセルを検出した場合、以降のバッチ処理を中止
          if (userCancelled) break;
        } catch (error) {
          console.error(`Batch transfer failed:`, error);
          results.push({
            signature: signature || '',
            status: 'error',
            error: `Batch transfer failed: ${(error as Error).message}`,
            timestamp: Date.now(),
            recipients: batchRecipients
          });
        }
  
        // バッチ間の遅延
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
  
      console.log(`Transfer operation completed. Results:`, results);
      return results;
    } catch (error) {
      console.error('Transfer operation failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, createBatchTransferTransaction, getWalletAdapter]);

  return {
    transfer,
    loading
  };
}