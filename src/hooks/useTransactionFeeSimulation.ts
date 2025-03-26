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

// 環境変数の読み込み
const SIMULATED_NETWORK = import.meta.env.VITE_SIMULATED_NETWORK === 'true';
const SIMULATED_TRANSACTION_FEE = parseFloat(
  import.meta.env.VITE_SIMULATED_TRANSACTION_FEE || '0'
);
const SIMULATED_SPL_TOKEN_ACCOUNT_FEE = parseFloat(
  import.meta.env.VITE_SIMULATED_SPL_TOKEN_ACCOUNT_FEE || '0'
);

export interface FeeEstimation {
  totalFee: number;
  accountCreationFees: number;
  transactionFees: number;
  operationFees: number;
  isLoading: boolean;
  simulatedSuccess: boolean;
  transactionFeeFallback: boolean;
  accountCreationFeeFallback: boolean;
  totalFeeFallback: boolean;
  progress: {
    current: number;
    total: number;
    step: string;
  };
}

export const calculateFees = (
  DEPOSIT_SOL_AMOUNT: string,
  parsedEntries: AddressEntry[],
  BATCH_SIZE: number,
  selectedToken: string = 'SOL'
): FeeEstimation => {
  // 基本の手数料計算
  const { operationFeePerTx, estimatedTxCount, operationFees, transactionFee } =
    getOperationFee(DEPOSIT_SOL_AMOUNT, parsedEntries, BATCH_SIZE);

  // SPLトークンの場合、アカウント作成手数料を計算（全アドレスにアカウントが必要と想定）
  const accountCreationFees =
    selectedToken !== 'SOL'
      ? parsedEntries.length * SIMULATED_SPL_TOKEN_ACCOUNT_FEE
      : 0;

  return {
    totalFee: operationFees + transactionFee + accountCreationFees,
    accountCreationFees,
    transactionFees: transactionFee,
    operationFees: operationFees,
    isLoading: false,
    simulatedSuccess: false,
    transactionFeeFallback: !SIMULATED_NETWORK,
    accountCreationFeeFallback: !SIMULATED_NETWORK,
    totalFeeFallback: !SIMULATED_NETWORK,
    progress: {
      current: 0,
      total: 0,
      step: 'Fixed fee calculation completed',
    },
  };
};

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

  // トランザクション手数料の計算
  // VITE_SIMULATED_NETWORKがfalseの場合は固定値を使用
  const transactionFee = !SIMULATED_NETWORK
    ? SIMULATED_TRANSACTION_FEE * estimatedTxCount // トランザクション数分の手数料を計算
    : 0;

  console.log(
    `💼 運営手数料: ${operationFees.toFixed(8)} SOL (${operationFeePerTx} SOL × ${estimatedTxCount}トランザクション)`,
    `\n💰 トランザクション手数料: ${transactionFee} SOL (${SIMULATED_TRANSACTION_FEE} SOL × ${estimatedTxCount}トランザクション)`,
    `\n🔧 シミュレーションモード: ${SIMULATED_NETWORK ? 'ON' : 'OFF'}`
  );

  return {
    operationFeePerTx,
    estimatedTxCount,
    operationFees,
    transactionFee,
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
