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
  Link,
  List,
  ListItem,
  ListItemText,
  Chip,
} from "@mui/material";
import { ContentPaste, ContentCopy, OpenInNew } from "@mui/icons-material";

// カスタムフックのインポート
import { useWallet } from "../../hooks/useWallet";
import { useConnection } from "../../hooks/useConnection";
import { useBalance } from "../../hooks/useBalance";
import { useTokenAccounts } from "../../hooks/useTokenAccounts";
import { useTokenTransfer } from "../../hooks/useTokenTransfer";
import { useTranslation } from "react-i18next";

// ヘッダーコンポーネント
import Header from "../../components/Header";
import TokenList from "../../components/TokenList";

// インターフェース定義
interface TransactionResult {
  signature: string;
  status: "success" | "error";
  timestamp: number;
  error?: string;
  recipients: string[];
  amount: number;
  token: string;
}

// メインのSenderコンポーネント
const Sender: React.FC = () => {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected, walletInfo } = useWallet();
  const { balance, loading: loadingSol } = useBalance(connection, publicKey);
  const { accounts: tokenAccounts, loading: loadingTokens } = useTokenAccounts(
    connection,
    publicKey
  );
  const { transfer, loading: transferring } = useTokenTransfer(connection, publicKey);
  const { t } = useTranslation(); // 翻訳フック

  // Local state
  const [selectedToken, setSelectedToken] = useState<string>("SOL");
  const [recipientAddresses, setRecipientAddresses] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [transactionResults, setTransactionResults] = useState<TransactionResult[]>([]);

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

  // handleTransfer 関数の修正
  const handleTransfer = async () => {
    if (!connected || !publicKey) return;

    try {
      const recipients = recipientAddresses
        .split("\n")
        .map((addr) => addr.trim())
        .filter((addr) => addr.length > 0);

      if (recipients.length === 0) {
        setSnackbarMessage("No valid recipient addresses found");
        setSnackbarOpen(true);
        return;
      }

      // 選択されたトークンに関する情報を取得
      let selectedTokenInfo = null;
      if (selectedToken !== "SOL") {
        // トークンアカウントから選択されたトークンの情報を探す
        selectedTokenInfo = tokenAccounts.find((account) => account.mint === selectedToken);

        if (!selectedTokenInfo) {
          setSnackbarMessage("Selected token information not found");
          setSnackbarOpen(true);
          return;
        }

        // 残高チェック
        const totalAmount = transferAmount * recipients.length;
        if (totalAmount > selectedTokenInfo.uiAmount) {
          setSnackbarMessage(
            `Insufficient balance. You need ${totalAmount} tokens but have only ${selectedTokenInfo.uiAmount}`
          );
          setSnackbarOpen(true);
          return;
        }
      } else {
        // SOLの場合は残高チェック
        const totalAmount = transferAmount * recipients.length;
        if (balance && totalAmount > balance) {
          setSnackbarMessage(
            `Insufficient SOL balance. You need ${totalAmount} SOL but have only ${balance}`
          );
          setSnackbarOpen(true);
          return;
        }
      }

      // 処理中の状態を設定
      setSnackbarMessage(
        "Processing transfers... Please wait and approve transactions in your wallet."
      );
      setSnackbarOpen(true);

      // 転送実行
      const results = await transfer({
        recipients,
        amount: transferAmount,
        mint: selectedToken === "SOL" ? undefined : selectedToken,
      });

      const formattedResults: TransactionResult[] = results.map((result) => ({
        signature: result.signature,
        status: result.status,
        timestamp: Date.now(),
        error: result.error,
        recipients: result.recipients || [],
        amount: transferAmount,
        token: selectedToken,
      }));

      setTransactionResults((prev) => [...formattedResults, ...prev]);

      const successful = results.filter((r) => r.status === "success");
      if (successful.length > 0) {
        setSnackbarMessage(
          `Successfully transferred to ${successful.length} out of ${recipients.length} recipients`
        );
      } else {
        setSnackbarMessage(`Transfer failed. Check transaction details for more information.`);
      }
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
    <>
      <Header />
      <Box
        sx={{
          pt: 0.01,
          mt: "12vh",
          height: "88vh",
          bgcolor: "#2b2e45",
          position: "relative",
          overflowY: "auto",
        }}
      >
        <Container maxWidth="md">
          {/* Wallet Connection Warning */}
          {!connected && (
            <Card sx={{ mt: 4, p: 3, my: 4, borderRadius: 2, bgcolor: "#ffffff" }}>
              <Typography
                variant="h4"
                sx={{ textAlign: "center", fontWeight: "bold", color: "#000000" }}
              >
                {t("Please connect your wallet in the header")}
              </Typography>
            </Card>
          )}

          {/* SOL Balance & Address */}
          <Card sx={{ my: 4 }}>
            <CardContent>
              <Typography variant="h6" mb={2} textAlign="center">
                {t("SOL Balance")}
              </Typography>
              {loadingSol ? (
                <Box textAlign="center" p={2}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <Typography variant="h4" fontWeight="bold" color="green" textAlign="center">
                  {balance?.toFixed(8) ?? "0.00000000"} SOL
                </Typography>
              )}

              <Divider sx={{ my: 2 }} />

              <Typography variant="h6" mb={1} textAlign="center">
                {t("Wallet Address")}
              </Typography>
              <Box
                sx={{
                  position: "relative",
                  display: "flex",
                  alignItems: "center",
                  border: "1px solid #ccc",
                  borderRadius: 1,
                  p: 1,
                  height: 36,
                }}
              >
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
          <TokenList tokenAccounts={tokenAccounts} loading={loadingTokens} />

          {/* Transfer Form */}
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" textAlign="center" mb={2}>
                {t("Token Transfer")}
              </Typography>

              {/* Token Selection */}
              <FormControl fullWidth sx={{ mb: 3 }}>
                <InputLabel>{t("Select Token")}</InputLabel>
                <Select
                  value={selectedToken}
                  label={t("Select Token")}
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
                  {t("Recipient Addresses")}
                </Typography>
                <Box position="relative">
                  <TextField
                    multiline
                    rows={4}
                    fullWidth
                    value={recipientAddresses}
                    onChange={(e) => setRecipientAddresses(e.target.value)}
                    placeholder={t("Enter Solana addresses (one per line)")}
                  />
                  <IconButton
                    onClick={pasteAddresses}
                    sx={{ position: "absolute", top: 8, right: 8 }}
                  >
                    <ContentPaste />
                  </IconButton>
                </Box>
                <Typography variant="caption" color="gray">
                  {t("Addresses")}: {parsedAddresses.length}
                </Typography>
              </Box>

              {/* Amount */}
              <Box mb={3}>
                <Typography variant="body2" fontWeight="bold" mb={1}>
                  {t("Amount")}
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
                  {t("Total amount")}: {transferAmount * parsedAddresses.length}{" "}
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
                    {t("Processing")}...
                  </>
                ) : (
                  t("Transfer")
                )}
              </Button>

              {/* Transaction Results */}
              {transactionResults.length > 0 && (
                <Box mt={3}>
                  <Typography variant="h6" gutterBottom>
                    {t("Recent Transactions")}
                  </Typography>
                  <List>
                    {transactionResults.map((result, index) => (
                      <ListItem
                        key={`${result.signature}-${index}`}
                        sx={{
                          bgcolor: "#f5f5f5",
                          borderRadius: 1,
                          mb: 1,
                          flexDirection: "column",
                          alignItems: "flex-start",
                          p: 2,
                        }}
                      >
                        {/* Status and Timestamp */}
                        <Box display="flex" alignItems="center" width="100%" mb={1}>
                          <Chip
                            label={result.status}
                            color={result.status === "success" ? "success" : "error"}
                            size="small"
                            sx={{ mr: 1 }}
                          />
                          <Typography variant="caption" color="text.secondary">
                            {new Date(result.timestamp).toLocaleString()}
                          </Typography>
                        </Box>

                        {/* Transfer Information */}
                        <Box
                          sx={{
                            width: "100%",
                            mb: 1,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            bgcolor: "rgba(0, 0, 0, 0.03)",
                            borderRadius: 1,
                            p: 1,
                          }}
                        >
                          <Typography variant="body2">
                            {result.amount} {result.token === "SOL" ? "SOL" : "tokens"}
                            {" x "}
                            {result.recipients.length} {t("recipients")}
                          </Typography>
                          <Typography variant="body2" color="primary">
                            Total: {result.amount * result.recipients.length}{" "}
                            {result.token === "SOL" ? "SOL" : "tokens"}
                          </Typography>
                        </Box>

                        {/* Signature with Copy and Link */}
                        <Box
                          display="flex"
                          alignItems="center"
                          width="100%"
                          sx={{ wordBreak: "break-all" }}
                        >
                          <ListItemText
                            primary={
                              <Link
                                href={`https://${
                                  connection.rpcEndpoint.includes("devnet")
                                    ? "solscan.io/tx/"
                                    : "solscan.io/tx/"
                                }${result.signature}${
                                  connection.rpcEndpoint.includes("devnet") ? "?cluster=devnet" : ""
                                }`}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ display: "flex", alignItems: "center" }}
                              >
                                {result.signature}
                                <OpenInNew sx={{ ml: 1, fontSize: 16 }} />
                              </Link>
                            }
                          />
                          <IconButton
                            size="small"
                            onClick={() => copyAddress(result.signature)}
                            sx={{ ml: 1 }}
                          >
                            <ContentCopy fontSize="small" />
                          </IconButton>
                        </Box>

                        {/* Error Message */}
                        {result.error && (
                          <Box
                            sx={{
                              mt: 1,
                              width: "100%",
                              backgroundColor: "error.light",
                              borderRadius: 1,
                              p: 1,
                            }}
                          >
                            <Typography variant="caption" color="error.dark">
                              Error: {result.error}
                            </Typography>
                          </Box>
                        )}
                      </ListItem>
                    ))}
                  </List>
                </Box>
              )}
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
    </>
  );
};

export default Sender;
