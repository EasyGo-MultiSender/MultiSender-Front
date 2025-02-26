import React, { useState, useEffect } from "react";
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
import { TokenMetadata, useTokenMetadata } from "../hooks/useTokenMetadata";

// インターフェース定義
interface Account {
  mint: string;
  uiAmount: number;
}

interface TokenWithMetadata {
  account: Account;
  metadata: TokenMetadata | null;
}

// トークン表示用コンポーネント
const TokenDisplay = ({
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
};

// トークンリスト用の修正コンポーネント
interface TokenListProps {
  tokenAccounts: Account[];
  loading: boolean;
}

const TokenList: React.FC<TokenListProps> = ({ tokenAccounts, loading }) => {
  const [showAll, setShowAll] = useState(false);
  const { t } = useTranslation();
  const { connection } = useConnection();
  const { fetchMetadata } = useTokenMetadata(connection);

  // すべてのトークンメタデータを保持する状態
  const [tokensWithMetadata, setTokensWithMetadata] = useState<TokenWithMetadata[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);

  // すべてのトークンのメタデータを一度に取得
  useEffect(() => {
    const fetchAllMetadata = async () => {
      if (tokenAccounts.length === 0) return;

      setMetadataLoading(true);

      try {
        // Promise.allを使用して並列にメタデータを取得
        const metadataPromises = tokenAccounts.map((account) =>
          fetchMetadata(account.mint)
            .then((metadata) => ({ account, metadata }))
            .catch(() => ({ account, metadata: null }))
        );

        const results = await Promise.all(metadataPromises);
        setTokensWithMetadata(results);
      } catch (error) {
        console.error("Error fetching token metadata:", error);
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchAllMetadata();
  }, [tokenAccounts, fetchMetadata]);

  // 表示するトークンの数を制限
  const displayedTokens = showAll ? tokensWithMetadata : tokensWithMetadata.slice(0, 3);

  // 残りのトークン数
  const remainingTokens = tokensWithMetadata.length - 3;

  // ローディング状態の統合
  const isLoading = loading || metadataLoading;

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
                      color: "#2824f9", // ホバー時に変更する文字色を指定（例：赤）
                      transition: "all 0.3s", // ホバー時のアニメーションを指定
                      backgroundColor: "transparent", // 背景色は変更しない
                    },
                  }}
                  onClick={() => setShowAll(!showAll)}
                  endIcon={<ExpandMore sx={{ transform: showAll ? "rotate(180deg)" : "none" }} />}
                >
                  {showAll ? t("Show less") : t(`Show more (${remainingTokens})`)}
                </Button>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenList;
