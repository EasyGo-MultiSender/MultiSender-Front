// src/hooks/useTokenTransfer.ts
import { useCallback, useState } from 'react';
import { 
  Connection, 
  PublicKey, 
  Transaction, 
  SystemProgram,
  LAMPORTS_PER_SOL,
  sendAndConfirmTransaction
} from "@solana/web3.js";
import { 
  TOKEN_PROGRAM_ID,
  createTransferInstruction
} from "@solana/spl-token";

interface TransferParams {
  recipient: string;
  amount: number;
  mint?: string;  // SOL転送の場合は不要
}

export const useTokenTransfer = (
  connection: Connection,
  publicKey: PublicKey | null
) => {
  const [loading, setLoading] = useState(false);

  const transferSOL = useCallback(async (
    recipient: PublicKey,
    amount: number
  ) => {
    if (!publicKey) throw new Error("Wallet not connected");

    const transaction = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: publicKey,
        toPubkey: recipient,
        lamports: amount * LAMPORTS_PER_SOL
      })
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [/* wallet.payer */] // ここはwallet adapterから署名者を取得
    );

    return signature;
  }, [connection, publicKey]);

  const transferSPLToken = useCallback(async (
    recipient: PublicKey,
    amount: number,
    mint: PublicKey,
    sourceToken: PublicKey,
    destinationToken: PublicKey
  ) => {
    if (!publicKey) throw new Error("Wallet not connected");

    const transaction = new Transaction().add(
      createTransferInstruction(
        sourceToken,
        destinationToken,
        publicKey,
        amount,
        [],
        TOKEN_PROGRAM_ID
      )
    );

    const signature = await sendAndConfirmTransaction(
      connection,
      transaction,
      [/* wallet.payer */] // ここはwallet adapterから署名者を取得
    );

    return signature;
  }, [connection, publicKey]);

  const transfer = useCallback(async (params: TransferParams) => {
    setLoading(true);
    try {
      const recipientPubkey = new PublicKey(params.recipient);

      if (!params.mint) {
        // SOL転送
        return await transferSOL(recipientPubkey, params.amount);
      } else {
        // SPLトークン転送
        // ここでsourceTokenとdestinationTokenのアドレスを取得する必要があります
        const mintPubkey = new PublicKey(params.mint);
        // アカウントの存在確認や作成なども必要
        return await transferSPLToken(
          recipientPubkey,
          params.amount,
          mintPubkey,
          new PublicKey("source"),
          new PublicKey("destination")
        );
      }
    } catch (error) {
      console.error("Transfer failed:", error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey, transferSOL, transferSPLToken]);

  return { transfer, loading };
};