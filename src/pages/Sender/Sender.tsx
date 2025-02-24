import React, { useState } from "react";
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  CircularProgress,
  Divider,
  Avatar,
  Snackbar,
  InputLabel,
  FormControl,
  MenuItem,
  Select,
} from "@mui/material";
import { ContentPaste, ContentCopy } from "@mui/icons-material";

// カスタムフックのインポート
import { useWallet } from "../../hooks/useWallet";
import { useConnection } from "../../hooks/useConnection";
import { useBalance } from "../../hooks/useBalance";
import { useTokenAccounts } from "../../hooks/useTokenAccounts";
import { useTokenMetadata } from "../../hooks/useTokenMetadata";
import { useTokenTransfer } from "../../hooks/useTokenTransfer";

// ヘッダーコンポーネント
import Header from "../../components/Header"; // ここに今後、言語切り替え設定、ネットワーク切り替え設定を入れる予定


// トークン表示用コンポーネント
const TokenDisplay: React.FC<{ account: any }> = ({ account }) => {
  const { connection } = useConnection();
  const { fetchMetadata } = useTokenMetadata(connection);
  const [metadata, setMetadata] = React.useState<any>(null);

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
          src={metadata?.image || "/token-placeholder.png"}
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
          {metadata?.uri && (
            <Typography variant="caption" display="block" color="text.secondary">
              URI: {metadata.uri}
            </Typography>
          )}
        </Box>
      </Box>
      <Typography variant="body2" fontWeight="bold">
        {account.uiAmount} {metadata?.symbol || ""}
      </Typography>
    </Box>
  );
};

const Sender: React.FC = () => {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected, walletInfo } = useWallet();
  const { balance, loading: loadingSol } = useBalance(connection, publicKey);
  const { accounts: tokenAccounts, loading: loadingTokens } = useTokenAccounts(connection, publicKey);
  const { transfer, loading: transferring } = useTokenTransfer(connection, publicKey);

  // Local state
  const [selectedToken, setSelectedToken] = useState<string>("SOL");
  const [recipientAddresses, setRecipientAddresses] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");

  // ユーティリティ関数
  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setSnackbarMessage("Copied Address: " + addr);
    setSnackbarOpen(true);
  };

  const pasteAddresses = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipientAddresses((prev) => (prev.length > 0 ? prev + "\n" + text : text));
    } catch (err) {
      console.error("Failed to read clipboard:", err);
    }
  };

  const handleTransfer = async () => {
    if (!connected || !publicKey) return;

    try {
      const addresses = recipientAddresses
        .split("\n")
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      for (const recipient of addresses) {
        await transfer({
          recipient,
          amount: transferAmount,
          mint: selectedToken === "SOL" ? undefined : selectedToken
        });
      }

      setSnackbarMessage("Transfer completed successfully!");
      setSnackbarOpen(true);
    } catch (error) {
      console.error("Transfer failed:", error);
      setSnackbarMessage("Transfer failed: " + (error as Error).message);
      setSnackbarOpen(true);
    }
  };

  const parsedAddresses = recipientAddresses
    .split("\n")
    .map((addr) => addr.trim())
    .filter((addr) => addr.length > 0);

  return (
    <Box
      sx={{
        pt: 0.01,
        mt: "12vh",
        minHeight: "88vh",
        bgcolor: "#2b2e45",
        position: "relative",
      }}
    >
      <Header />
      <Container maxWidth="md">
        {/* Wallet Connection Warning */}
        {!connected && (
          <Card sx={{ mt: 4, p: 3, my: 4, borderRadius: 2, bgcolor: "#ffffff" }}>
            <Typography variant="h4" sx={{ textAlign: "center", fontWeight: "bold", color: "#000000" }}>
              Please connect your wallet in the header
            </Typography>
          </Card>
        )}

        {/* SOL Balance & Address */}
        <Card sx={{ my: 4 }}>
          <CardContent>
            <Typography variant="h6" mb={2} textAlign="center">
              SOL Balance
            </Typography>
            {loadingSol ? (
              <CircularProgress size={24} />
            ) : (
              <Typography variant="h4" fontWeight="bold" color="green" textAlign="center">
                {balance?.toFixed(5) ?? "0.00000"} SOL
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" mb={1} textAlign="center">
              Wallet Address
            </Typography>
            <Box sx={{ position: "relative", display: "flex", alignItems: "center", 
                      border: "1px solid #ccc", borderRadius: 1, p: 1, height: 36 }}>
              <Typography variant="body2" sx={{ flex: 1, textAlign: "center" }}>
                {publicKey?.toBase58()}
              </Typography>
              <IconButton
                onClick={() => publicKey && copyAddress(publicKey.toBase58())}
                sx={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)" }}
              >
                <ContentCopy />
              </IconButton>
            </Box>
          </CardContent>
        </Card>

        {/* Token List */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" textAlign="center">
              SPL Tokens
            </Typography>
            {loadingTokens ? (
              <Box textAlign="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : tokenAccounts.length === 0 ? (
              <Box textAlign="center" p={2} color="gray">
                No SPL tokens found
              </Box>
            ) : (
              tokenAccounts.map((account) => (
                <TokenDisplay key={account.mint} account={account} />
              ))
            )}
          </CardContent>
        </Card>

        {/* Transfer Form */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" textAlign="center" mb={2}>
              Token Transfer
            </Typography>

            {/* Token Selection */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Select Token</InputLabel>
              <Select
                value={selectedToken}
                label="Select Token"
                onChange={(e) => setSelectedToken(e.target.value)}
              >
                <MenuItem value="SOL">SOL</MenuItem>
                {tokenAccounts.map((account) => (
                  <MenuItem key={account.mint} value={account.mint}>
                    {account.mint.slice(0, 4)}...{account.mint.slice(-4)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Recipient Addresses */}
            <Box mb={3}>
              <Typography variant="body2" fontWeight="bold" mb={1}>
                Recipient Addresses
              </Typography>
              <Box position="relative">
                <TextField
                  multiline
                  rows={4}
                  fullWidth
                  value={recipientAddresses}
                  onChange={(e) => setRecipientAddresses(e.target.value)}
                  placeholder="Enter Solana addresses (one per line)"
                />
                <IconButton
                  onClick={pasteAddresses}
                  sx={{ position: "absolute", top: 8, right: 8 }}
                >
                  <ContentPaste />
                </IconButton>
              </Box>
              <Typography variant="caption" color="gray">
                Addresses: {parsedAddresses.length}
              </Typography>
            </Box>

            {/* Amount */}
            <Box mb={3}>
              <Typography variant="body2" fontWeight="bold" mb={1}>
                Amount
              </Typography>
              <TextField
                type="number"
                fullWidth
                value={transferAmount}
                onChange={(e) => setTransferAmount(Number(e.target.value))}
                InputProps={{ inputProps: { min: 0, step: "any" } }}
                placeholder="Enter amount"
              />
              <Typography variant="caption" color="blue">
                Total amount: {transferAmount * parsedAddresses.length}{" "}
                {selectedToken === "SOL" ? "SOL" : "tokens"}
              </Typography>
            </Box>

            {/* Transfer Button */}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleTransfer}
              disabled={!connected || transferring || !parsedAddresses.length || !transferAmount}
            >
              {transferring ? (
                <>
                  <CircularProgress size={20} sx={{ color: "#fff", mr: 1 }} />
                  Processing...
                </>
              ) : (
                "Transfer"
              )}
            </Button>
          </CardContent>
        </Card>
      </Container>

      {/* Notifications */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default Sender;