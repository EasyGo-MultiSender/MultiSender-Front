// src/hooks/useBalance.ts
import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from "@solana/web3.js";

export const useBalance = (
  connection: Connection,
  publicKey: PublicKey | null
) => {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchBalance = useCallback(async () => {
    if (!publicKey) {
      setBalance(null);
      return;
    }

    setLoading(true);
    try {
      const lamports = await connection.getBalance(publicKey);
      setBalance(lamports / 10 ** 9);
    } catch (error) {
      console.error("Failed to fetch balance:", error);
      setBalance(null);
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  // WebSocketサブスクリプション
  useEffect(() => {
    if (!publicKey) return;

    // 残高変更のサブスクリプション
    const subscriptionId = connection.onAccountChange(
      publicKey,
      (accountInfo) => {
        setBalance(accountInfo.lamports / 10 ** 9);
      },
      "confirmed"
    );

    // 初回残高取得
    fetchBalance();

    return () => {
      connection.removeAccountChangeListener(subscriptionId);
    };
  }, [connection, publicKey, fetchBalance]);

  return { balance, loading, fetchBalance };
};