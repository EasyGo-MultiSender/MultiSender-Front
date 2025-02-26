import React, { useState, useEffect, useCallback, memo, forwardRef, useImperativeHandle, useRef } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Button,
  Avatar,
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useConnection } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { TokenMetadata, useTokenMetadata } from "../hooks/useTokenMetadata";
import { useTokenAccounts } from "../hooks/useTokenAccounts";

// グローバルキャッシュ - コンポーネントのマウント間で保持される
const CACHED_TOKEN_DATA = new Map<string, any>();

// インターフェース定義
export interface Account {
  mint: string;
  uiAmount: number;
}

interface TokenWithMetadata {
  account: Account;
  metadata: TokenMetadata | null;
}

// トークンリストへの外部からの参照用インターフェース
export interface TokenListRef {
  getTokenAccounts: () => Account[];
}

// トークン表示用コンポーネント
const TokenDisplay = memo(({
  account,
  metadata,
}: {
  account: Account;
  metadata: TokenMetadata | null;
}) => {
  return (
    <Box
      display="flex"
      alignItems="center"
      justifyContent="space-between"
      borderTop="1px solid #eee"
      py={1}
      px={1}
    >
      <Box display="flex" alignItems="center" gap={1}>
        <Avatar
          src={metadata?.uri || "/token-placeholder.png"}
          alt={metadata?.symbol || "Token"}
          sx={{ width: 32, height: 32 }}
        />
        <Box>
          <Typography variant="body1" fontWeight="bold">
            {metadata?.symbol || "Unknown"}
          </Typography>
          <Typography variant="caption" color="text.secondary">
            {metadata?.name || "Unknown Token"}
          </Typography>
        </Box>
      </Box>
      <Typography variant="body2" fontWeight="bold">
        {account.uiAmount} {metadata?.symbol || ""}
      </Typography>
    </Box>
  );
});

TokenDisplay.displayName = 'TokenDisplay';

// トークンリスト用のコンポーネント
interface TokenListProps {
  publicKey: PublicKey | null;
  loading?: boolean; // 既存のloadingを利用するかどうか
}

// forwardRefを使用して親コンポーネントからアクセスできるようにする
const TokenList = forwardRef<TokenListRef, TokenListProps>(({ publicKey, loading: externalLoading }, ref) => {
  const [showAll, setShowAll] = useState(false);
  const { t } = useTranslation();
  const { connection } = useConnection();
  const { fetchMetadata } = useTokenMetadata(connection);
  
  // トークンアカウントの取得を内部化
  const { accounts: tokenAccounts, loading: loadingTokens } = useTokenAccounts(
    connection,
    publicKey
  );

  // 内部のtokenAccountsをrefに保存して参照の安定性を確保
  const tokenAccountsRef = useRef<Account[]>([]);

  // トークンアカウントが変更されたら内部refを更新
  useEffect(() => {
    tokenAccountsRef.current = tokenAccounts;
  }, [tokenAccounts]);

  // すべてのトークンメタデータを保持する状態
  const [tokensWithMetadata, setTokensWithMetadata] = useState<TokenWithMetadata[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [dataFetched, setDataFetched] = useState(false);

  // キャッシュキーを生成
  const cacheKey = publicKey ? publicKey.toString() : "no-wallet";

  // 外部から呼び出し可能な関数を公開
  useImperativeHandle(ref, () => ({
    getTokenAccounts: () => tokenAccountsRef.current
  }), []);

  // メタデータ取得関数
  const fetchAllMetadata = useCallback(async () => {
    // すでに取得済みか、publicKeyがない場合は何もしない
    if (!publicKey || tokenAccounts.length === 0) return;

    // データがすでに取得済みならスキップ
    if (dataFetched && tokensWithMetadata.length > 0) return;

    // キャッシュをチェック
    if (CACHED_TOKEN_DATA.has(cacheKey)) {
      setTokensWithMetadata(CACHED_TOKEN_DATA.get(cacheKey));
      setDataFetched(true);
      return;
    }

    setMetadataLoading(true);

    try {
      // console.log(`Fetching metadata for ${tokenAccounts.length} tokens...`);
      
      // Promise.allを使用して並列にメタデータを取得
      const metadataPromises = tokenAccounts.map((account) =>
        fetchMetadata(account.mint)
          .then((metadata) => ({ account, metadata }))
          .catch(() => ({ account, metadata: null }))
      );

      const results = await Promise.all(metadataPromises);
      // 降順にソート
      results.sort((a, b) => b.account.uiAmount - a.account.uiAmount);

      // 結果をキャッシュと状態に保存
      CACHED_TOKEN_DATA.set(cacheKey, results);
      setTokensWithMetadata(results);
      setDataFetched(true);
      
      // console.log(`Metadata fetch complete, cached with key: ${cacheKey}`);
    } catch (error) {
      console.error("Error fetching token metadata:", error);
    } finally {
      setMetadataLoading(false);
    }
  }, [publicKey, tokenAccounts, fetchMetadata, cacheKey, dataFetched, tokensWithMetadata.length]);

  // publicKeyまたはtokenAccountsが変わったときにデータを取得
  useEffect(() => {
    if (publicKey && tokenAccounts.length > 0) {
      // キャッシュが無効になったらリセット
      if (publicKey.toString() !== cacheKey && dataFetched) {
        setDataFetched(false);
      }
      
      fetchAllMetadata();
    }
  }, [publicKey, tokenAccounts, fetchAllMetadata, cacheKey, dataFetched]);

  // 表示するトークンの数を制限
  const displayedTokens = showAll ? tokensWithMetadata : tokensWithMetadata.slice(0, 3);

  // 残りのトークン数
  const remainingTokens = tokensWithMetadata.length - 3;

  // ローディング状態を集約
  const isLoading = externalLoading || loadingTokens || metadataLoading;

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" textAlign="center">
          {t("SPL Tokens")}
        </Typography>
        {isLoading ? (
          <Box textAlign="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : tokensWithMetadata.length === 0 ? (
          <Box textAlign="center" p={2}>
            {t("No SPL tokens found")}
          </Box>
        ) : (
          <>
            {displayedTokens.map(({ account, metadata }) => (
              <TokenDisplay key={account.mint} account={account} metadata={metadata} />
            ))}

            {/* もっと見るボタン */}
            {tokensWithMetadata.length > 3 && (
              <Box textAlign="center" mt={1}>
                <Button
                  disableRipple
                  variant="text"
                  size="small"
                  sx={{
                    ":hover": {
                      color: "#2824f9", 
                      transition: "all 0.3s", 
                      backgroundColor: "transparent", 
                    },
                  }}
                  onClick={() => setShowAll(!showAll)}
                  endIcon={<ExpandMore sx={{ transform: showAll ? "rotate(180deg)" : "none" }} />}
                >
                  {showAll ? t("Show less") : t("Show more", { count: remainingTokens })}
                </Button>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
});

TokenList.displayName = 'TokenList';

// Sender.tsxに公開する最適化されたトークンリスト
export default TokenList;