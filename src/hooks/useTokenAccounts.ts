// src/hooks/useTokenAccounts.ts
import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from "@solana/web3.js";
import { TokenListProvider } from "@solana/spl-token-registry";

const TOKEN_PROGRAM_ID = import.meta.env.VITE_TOKEN_PROGRAM_ID;
const TOKEN_2022_PROGRAM_ID = import.meta.env.VITE_TOKEN_2022_PROGRAM_ID;

interface TokenAccount {
  mint: string;
  amount: number;
  decimals: number;
  uiAmount: number;
  owner: string;
}

export const useTokenAccounts = (
  connection: Connection,
  publicKey: PublicKey | null
) => {
  const [accounts, setAccounts] = useState<TokenAccount[]>([]);
  const [loading, setLoading] = useState(false);
  const [tokenMap, setTokenMap] = useState<Map<string, any>>(new Map());

  // Token Listの取得
  useEffect(() => {
    new TokenListProvider().resolve().then(tokens => {
      const tokenList = tokens.filterByClusterSlug('mainnet-beta').getList();
      setTokenMap(new Map(tokenList.map(item => [item.address, item])));
    });
  }, []);

  const fetchAccounts = useCallback(async () => {
    if (!publicKey) return [];
    
    setLoading(true);
    try {
      const [tokenAccounts, token2022Accounts] = await Promise.all([
        connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: new PublicKey(TOKEN_PROGRAM_ID) }
        ),
        connection.getParsedTokenAccountsByOwner(
          publicKey,
          { programId: new PublicKey(TOKEN_2022_PROGRAM_ID) }
        )
      ]);

      const processedAccounts = [...tokenAccounts.value, ...token2022Accounts.value]
        .map(account => {
          const parsedInfo = account.account.data.parsed.info;
          return {
            mint: parsedInfo.mint,
            amount: parsedInfo.tokenAmount.amount,
            decimals: parsedInfo.tokenAmount.decimals,
            uiAmount: parsedInfo.tokenAmount.uiAmount,
            owner: parsedInfo.owner
          };
        })
        .filter(account => account.uiAmount > 0);

      setAccounts(processedAccounts);
      return processedAccounts;
    } catch (error) {
      console.error("Error fetching token accounts:", error);
      return [];
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, fetchAccounts, tokenMap };
};