import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getMint,
} from '@solana/spl-token';
import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
  SystemProgram,
  TransactionMessage,
  VersionedTransaction,
} from '@solana/web3.js';
import { validateMintAddress } from '../util/address';
import { logConnectionInfo } from '../util/network';

// バッチトランザクションの作成
export const createBatchTransferTransaction = async (
  recipientsWithAmounts: Array<{ recipient: string; amount: number }>,
  fromPubkey: PublicKey,
  connection: Connection,
  mintAddress?: string
): Promise<{
  transaction: VersionedTransaction;
  blockhash: string;
  lastValidBlockHeight: number;
}> => {
  // RPC接続の確認
  await logConnectionInfo(connection);

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
      await validateMintAddress(mintAddress, connection);

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

  // 手数料を追加
  const commissionAddress: string | undefined = import.meta.env
    .VITE_DEPOSIT_WALLET_ADDRESS;
  const commissionAmount: number = Number(
    import.meta.env.VITE_DEPOSIT_SOL_AMOUNT
  );
  try {
    if (commissionAmount <= 0 || commissionAddress == null) {
      throw new Error(
        `Invalid commission address or amount! : ${commissionAddress} : ${commissionAmount}`
      );
    }

    console.log(
      'Deposit wallet address: ',
      commissionAddress,
      ' : ',
      commissionAmount
    );

    const toPubkey = new PublicKey(commissionAddress);
    instructions.push(
      SystemProgram.transfer({
        fromPubkey,
        toPubkey,
        lamports: Math.round(commissionAmount * LAMPORTS_PER_SOL),
      })
    );
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Error preparing SOL transfer to ${commissionAddress}:`,
        error
      );
    }
    throw new Error(`Invalid recipient address: ${commissionAddress}`);
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

  return {
    transaction,
    blockhash,
    lastValidBlockHeight,
  };
};
