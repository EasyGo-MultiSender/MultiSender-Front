import { useCallback, useState, RefObject } from 'react';
import { TokenListRef, TokenWithMetadata } from '@/components/TokenList';

/**
 * トークンリストとメタデータを管理するカスタムフック
 *
 * @param tokenListRef TokenListコンポーネントへの参照
 * @returns トークン関連の状態と関数
 */
export const useTokenListMetadata = (
  tokenListRef: RefObject<TokenListRef | null>
) => {
  // メタデータ付きトークンを保持する状態
  const [tokensWithMetadata, setTokensWithMetadata] = useState<
    TokenWithMetadata[]
  >([]);
  // トークンリストのロード状態
  const [tokensLoading, setTokensLoading] = useState(true);

  /**
   * トークンメタデータを含むトークンアカウントを取得する関数
   * @returns トークンリスト
   */
  const fetchTokensWithMetadata = useCallback(async () => {
    if (!tokenListRef.current) return [];

    setTokensLoading(true);
    try {
      console.log('Explicitly fetching token metadata');
      const tokens = await tokenListRef.current.fetchMetadata();
      setTokensWithMetadata(tokens);

      console.log(`Found ${tokens.length} tokens with metadata`);
      // tokens配列の内容をコンソールに出力して確認
      if (tokens.length > 0) {
        tokens.forEach((token, index) => {
          console.log(`Token ${index + 1}:`, {
            mint: token.account.mint,
            amount: token.account.uiAmount,
            symbol: token.metadata?.symbol || 'Unknown',
            name: token.metadata?.name || 'Unknown Token',
          });
        });
      }

      return tokens;
    } catch (error) {
      console.error('Error fetching tokens with metadata:', error);
      return [];
    } finally {
      setTokensLoading(false);
    }
  }, [tokenListRef]);

  /**
   * TokenListからのデータロード完了時のコールバック
   */
  const handleTokenDataLoaded = useCallback((tokens: TokenWithMetadata[]) => {
    console.log(`Token data loaded callback: ${tokens.length} tokens received`);
    setTokensWithMetadata(tokens);
    setTokensLoading(false);
  }, []);

  /**
   * トークンリストがロード中かどうか
   */
  const isTokenListLoading = useCallback(() => {
    return tokensLoading || (tokenListRef.current?.isLoading() ?? false);
  }, [tokensLoading, tokenListRef]);

  /**
   * 選択されたトークンの情報を取得
   */
  const getTokenInfo = useCallback(
    (selectedToken: string) => {
      if (selectedToken === 'SOL') {
        return {
          symbol: 'SOL',
          name: 'Solana',
          mint: 'SOL',
          icon: '/solana-icon.png', // SOLアイコンのパス
          decimals: 9,
        };
      }

      const tokenInfo = tokensWithMetadata.find(
        (t) => t.account.mint === selectedToken
      );

      return {
        symbol: tokenInfo?.metadata?.symbol || 'Unknown',
        name: tokenInfo?.metadata?.name || 'Unknown Token',
        mint: selectedToken,
        icon: tokenInfo?.metadata?.uri || '/token-placeholder.png',
        decimals: tokenInfo?.account.decimals ?? 9,
      };
    },
    [tokensWithMetadata]
  );

  return {
    tokensWithMetadata,
    tokensLoading,
    fetchTokensWithMetadata,
    handleTokenDataLoaded,
    isTokenListLoading: isTokenListLoading(),
    getTokenInfo,
  };
};
