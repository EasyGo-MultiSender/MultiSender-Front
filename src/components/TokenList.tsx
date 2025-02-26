import React, { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Button,
  Avatar
} from "@mui/material";
import { ExpandMore } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { useConnection } from "@solana/wallet-adapter-react";
import { TokenMetadata, useTokenMetadata } from "../hooks/useTokenMetadata";

// トークン表示用コンポーネント
interface Account {
  mint: string;
  uiAmount: number;
}

const TokenDisplay = ({ account }: { account: Account }) => {
  const { connection } = useConnection();
  const { fetchMetadata } = useTokenMetadata(connection);
  const [metadata, setMetadata] = React.useState<TokenMetadata | null>(null);

  React.useEffect(() => {
    fetchMetadata(account.mint).then(setMetadata);
  }, [account.mint, fetchMetadata]);

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
  
  // 表示するトークンの数を制限
  const displayedTokens = showAll ? tokenAccounts : tokenAccounts.slice(0, 3);
  // 残りのトークン数
  const remainingTokens = tokenAccounts.length - 3;

  return (
    <Card sx={{ mb: 4 }}>
      <CardContent>
        <Typography variant="h6" textAlign="center">
          {t("SPL Tokens")}
        </Typography>
        {loading ? (
          <Box textAlign="center" p={2}>
            <CircularProgress size={24} />
          </Box>
        ) : tokenAccounts.length === 0 ? (
          <Box textAlign="center" p={2}>
            {t("No SPL tokens found")}
          </Box>
        ) : (
          <>
            {displayedTokens.map((account) => (
              <TokenDisplay key={account.mint} account={account} />
            ))}
            
            {/* もっと見るボタン */}
            {tokenAccounts.length > 3 && (
              <Box textAlign="center" mt={1}>
                <Button
                  variant="text"
                  size="small"
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