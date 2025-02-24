import { useState, useCallback } from 'react';
import { 
  PublicKey, 
  Connection,
  LAMPORTS_PER_SOL,
  SystemProgram,
  VersionedTransaction,
  TransactionMessage
} from '@solana/web3.js';
import { 
  createTransferInstruction,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction
} from '@solana/spl-token';

const BATCH_SIZE = Number(import.meta.env.VITE_TRANSFER_BATCH_SIZE) || 9;
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second between retries
const TRANSACTION_TIMEOUT = 120000; // 120秒のタイムアウトに増やす

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

        const toTokenAccountInfo = await connection.getAccountInfo(toTokenAccount);
        
        if (!toTokenAccountInfo) {
          instructions.push(
            createAssociatedTokenAccountInstruction(
              fromPubkey,
              toTokenAccount,
              toPubkey,
              mintPubkey
            )
          );
        }

        instructions.push(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            fromPubkey,
            BigInt(Math.round(amount * Math.pow(10, 9))) // Assuming 9 decimals
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

    const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('finalized');

    const messageV0 = new TransactionMessage({
      payerKey: fromPubkey,
      recentBlockhash: blockhash,
      instructions
    }).compileToV0Message();

    return new VersionedTransaction(messageV0);
  };

  const waitForTransactionConfirmation = async (
    connection: Connection, 
    signature: string, 
    blockhash: string,
    lastValidBlockHeight: number
  ): Promise<boolean> => {
    const startTime = Date.now();

    while (Date.now() - startTime < TRANSACTION_TIMEOUT) {
      try {
        const confirmation = await connection.confirmTransaction({
          signature,
          blockhash,
          lastValidBlockHeight
        }, 'finalized');

        if (confirmation.value.err === null) {
          return true;
        }

        if (confirmation.value.err) {
          console.error('Transaction failed:', confirmation.value.err);
          return false;
        }
      } catch (error) {
        // If it's a blockheight exceeded error, continue waiting
        if (!(error instanceof Error && error.message.includes('TransactionExpiredBlockheightExceededError'))) {
          throw error;
        }
      }

      // Wait a bit before checking again
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    throw new Error('Transaction confirmation timed out');
  };

  const transfer = useCallback(async (params: TransferParams): Promise<TransferResult[]> => {
    if (!publicKey) throw new Error('Wallet not connected');
    
    if (!params.recipients || !Array.isArray(params.recipients) || params.recipients.length === 0) {
      throw new Error('Recipients must be a non-empty array');
    }

    setLoading(true);
    const results: TransferResult[] = [];
    
    try {
      const { recipients, amount, mint } = params;

      // バッチに分割
      const batches: string[][] = [];
      for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
        batches.push(recipients.slice(i, i + BATCH_SIZE));
      }

      // 各バッチのトランザクションを作成
      const transactions: VersionedTransaction[] = [];
      for (const batchRecipients of batches) {
        const tx = await createAndSignBatchTransaction(
          batchRecipients,
          amount,
          publicKey,
          mint
        );
        transactions.push(tx);
      }

      const wallet = window.xnft?.solana ?? window.phantom?.solana;
      if (!wallet) {
        throw new Error('No wallet adapter found');
      }

      const signedTransactions = await wallet.signAllTransactions(transactions);

      for (let i = 0; i < signedTransactions.length; i++) {
        const signedTx = signedTransactions[i];
        const batchRecipients = batches[i];
        
        let retries = 0;
        let success = false;

        while (retries < MAX_RETRIES && !success) {
          try {
            const signature = await connection.sendTransaction(signedTx, {
              skipPreflight: false,
              preflightCommitment: 'confirmed',
              maxRetries: 3
            });

            // Wait for transaction confirmation with improved timeout handling
            success = await waitForTransactionConfirmation(
              connection, 
              signature, 
              signedTx.message.recentBlockhash,
              signedTx.lastValidBlockHeight
            );

            if (success) {
              results.push({
                signature,
                status: 'success',
                timestamp: Date.now(),
                recipients: batchRecipients
              });
              break;
            }
          } catch (error) {
            if (error instanceof SendTransactionError) {
              console.error('Transaction failed:', error.message);
              console.error('Error logs:', await connection.getLogs());
            }
            console.error(`Batch ${i + 1} attempt ${retries + 1} failed:`, error);
            
            retries++;
            
            if (retries < MAX_RETRIES) {
              // Wait before retrying
              await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
              
              // Get a fresh blockhash before retrying
              const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
              signedTx.message.recentBlockhash = blockhash;
            }
          }
        }

        // If all retries failed
        if (!success) {
          results.push({
            signature: '',
            status: 'error',
            error: 'Failed to confirm transaction after multiple attempts',
            timestamp: Date.now(),
            recipients: batchRecipients
          });
        }

        // バッチ間の遅延
        if (i < signedTransactions.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }

      return results;
    } catch (error) {
      console.error('Transfer failed:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, createBatchTransferInstructions]);

  return {
    transfer,
    loading
  };
}