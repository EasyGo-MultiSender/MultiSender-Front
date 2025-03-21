import { createAssociatedTokenAccountInstruction } from '@solana/spl-token';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from '@solana/web3.js';
import { OperationFee } from './interfaces/transfer';
import { AddressEntry } from '@/types/transactionTypes.ts';

export const getOperationFee = (
  DEPOSIT_SOL_AMOUNT: string,
  parsedEntries: AddressEntry[],
  BATCH_SIZE: number
): OperationFee => {
  // 運営手数料の計算 (1トランザクションあたりのDEPOSIT_SOL_AMOUNT)
  const operationFeePerTx = parseFloat(DEPOSIT_SOL_AMOUNT) || 0;
  // トランザクション数の推定（バッチサイズで割って切り上げ）
  const estimatedTxCount = Math.ceil(parsedEntries.length / BATCH_SIZE);
  // 運営手数料の合計
  const operationFees = operationFeePerTx * estimatedTxCount;
  console.log(
    `💼 運営手数料: ${operationFees.toFixed(8)} SOL (${operationFeePerTx} SOL × ${estimatedTxCount}トランザクション)`
  );

  return {
    operationFeePerTx,
    estimatedTxCount,
    operationFees,
  };
};

export const createInstruction = (
  publicKey: PublicKey,
  entry: AddressEntry
): TransactionInstruction => {
  return SystemProgram.transfer({
    fromPubkey: publicKey,
    toPubkey: new PublicKey(entry.address),
    lamports: Math.floor(entry.amount * LAMPORTS_PER_SOL),
  });
};

export const createAccountInstruction = async (
  publicKey: PublicKey,
  receiverTokenAccount: PublicKey,
  receiverPubkey: PublicKey,
  tokenMint: PublicKey,
  connection: Connection
): Promise<Transaction> => {
  const createTx = new Transaction();

  // ATA作成命令を追加
  const createATAInstruction = createAssociatedTokenAccountInstruction(
    publicKey,
    receiverTokenAccount,
    receiverPubkey,
    tokenMint
  );
  createTx.add(createATAInstruction);

  // シミュレーション用ブロックハッシュ
  const { blockhash } = await connection.getLatestBlockhash('confirmed');
  createTx.recentBlockhash = blockhash;
  createTx.feePayer = publicKey;

  return createTx;
};
