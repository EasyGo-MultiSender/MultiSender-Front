// メインのSenderコンポーネント
import React, { useState, useEffect, useCallback, useRef } from "react";
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
import { useTokenTransfer } from "../../hooks/useTokenTransfer";
import { useTranslation } from "react-i18next";
import { useWalletAddressValidation } from '../../hooks/useWalletAddressValidation';

// ヘッダーコンポーネント
import Header from "../../components/Header";
import TokenList, { TokenListRef } from "../../components/TokenList";
import UploadButton from "../../components/UploadButton";

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

// アドレスとその送金金額のインターフェース
interface AddressEntry {
  address: string;
  amount: number;
}

// CSVからインポートされた受取人情報
interface Recipient {
  walletAddress: string;
  amount: number;
}

const Sender: React.FC = () => {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected, walletInfo } = useWallet();
  const { balance, loading: loadingSol } = useBalance(connection, publicKey);
  const { transfer, loading: transferring } = useTokenTransfer(connection, publicKey);
  const { t } = useTranslation(); // 翻訳フック
  const { isValidSolanaAddress } = useWalletAddressValidation();

  // TokenList から公開される関数を利用するための参照
  const tokenListRef = useRef<TokenListRef>(null);

  // Local state
  const [selectedToken, setSelectedToken] = useState<string>("SOL");
  const [recipientAddresses, setRecipientAddresses] = useState<string>("");
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [transactionResults, setTransactionResults] = useState<TransactionResult[]>([]);
  const [invalidEntries, setInvalidEntries] = useState<string[]>([]);
  const [duplicateAddresses, setDuplicateAddresses] = useState<string[]>([]);
  const [parsedEntries, setParsedEntries] = useState<AddressEntry[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  
  // 最後にパースした内容を保持して不要な再パースを防止
  const lastParsedAddressesRef = useRef<string>("");

  // アドレスとアマウントの構文解析と検証を行うメモ化された関数
  const parseAddressEntries = useCallback(() => {
    // 前回と同じ内容なら処理をスキップ
    if (recipientAddresses === lastParsedAddressesRef.current) {
      return;
    }
    
    lastParsedAddressesRef.current = recipientAddresses;
    
    const entries: AddressEntry[] = [];
    const invalidLines: string[] = [];
    const addressMap = new Map<string, number>();
    
    // 各行を解析
    const lines = recipientAddresses
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);
    
    for (const line of lines) {
      const parts = line.split(',').map(part => part.trim());
      const address = parts[0];
      const amountStr = parts[1];
      
      // アドレスとアマウントの検証
      if (!address || !isValidSolanaAddress(address) || !amountStr || isNaN(parseFloat(amountStr))) {
        invalidLines.push(line);
        continue;
      }
      
      const amount = parseFloat(amountStr);
      
      // 有効なエントリを追加
      entries.push({ address, amount });
      
      // 重複アドレスを追跡
      addressMap.set(address, (addressMap.get(address) || 0) + 1);
    }
    
    // 重複アドレスの特定
    const duplicates = Array.from(addressMap.entries())
      .filter(([_, count]) => count > 1)
      .map(([address]) => address);
    
    // 状態を更新
    setParsedEntries(entries);
    setInvalidEntries(invalidLines);
    setDuplicateAddresses(duplicates);
    
    // 合計金額を計算
    const sum = entries.reduce((total, entry) => total + entry.amount, 0);
    setTotalAmount(sum);
  }, [recipientAddresses, isValidSolanaAddress]);

  // recipientAddressesが変更されたときにだけパースを実行
  useEffect(() => {
    parseAddressEntries();
  }, [recipientAddresses, parseAddressEntries]);

  // CSVからのインポート処理
  const handleRecipientsLoaded = useCallback((recipients: Recipient[]) => {
    // CSVからインポートされた受取人情報を変換して設定
    const formattedAddresses = recipients.map(
      r => `${r.walletAddress},${r.amount}`
    ).join('\n');
    
    // テキストフィールドを更新
    setRecipientAddresses(formattedAddresses);
  }, []);

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

  // tokenListRefを通じてトークンアカウントデータを取得する関数
  // メモ化して安定したリファレンスを提供
  const getTokenAccountsForSelection = useCallback(() => {
    return tokenListRef.current?.getTokenAccounts() || [];
  }, []);

  // handleTransfer 関数
  const handleTransfer = async () => {
    // ウォレット接続チェック
    if (!connected || !publicKey) {
      setSnackbarMessage("Please connect your wallet");
      setSnackbarOpen(true);
      return;
    }
  
    if (parsedEntries.length === 0) {
      setSnackbarMessage("No valid recipient addresses found");
      setSnackbarOpen(true);
      return;
    }

    // 妥当性エラーがある場合は処理中止
    if (invalidEntries.length > 0 || duplicateAddresses.length > 0) {
      setSnackbarMessage(
        invalidEntries.length > 0 
          ? "Please correct invalid entries" 
          : "Please correct duplicate addresses"
      );
      setSnackbarOpen(true);
      return;
    }
  
    // TokenListから最新のトークンアカウント情報を取得
    const tokenAccounts = tokenListRef.current?.getTokenAccounts() || [];
  
    // 残高チェック
    if (selectedToken === "SOL") {
      // SOLの残高チェック
      if (balance && totalAmount > balance) {
        setSnackbarMessage(`Insufficient SOL balance. Required: ${totalAmount.toFixed(6)}, Available: ${balance.toFixed(6)}`);
        setSnackbarOpen(true);
        return;
      }
    } else {
      // トークンの残高チェック
      const selectedTokenAccount = tokenAccounts.find(account => account.mint === selectedToken);
      if (!selectedTokenAccount) {
        setSnackbarMessage("Selected token information not found");
        setSnackbarOpen(true);
        return;
      }
      
      if (totalAmount > selectedTokenAccount.uiAmount) {
        setSnackbarMessage(`Insufficient token balance. Required: ${totalAmount.toFixed(6)}, Available: ${selectedTokenAccount.uiAmount.toFixed(6)}`);
        setSnackbarOpen(true);
        return;
      }
    }

    try {
      // 転送処理中メッセージ
      setSnackbarMessage(
        "Processing transfers... Please wait and approve transactions in your wallet."
      );
      setSnackbarOpen(true);

      // バッチに分割して転送実行（最大10アドレスずつ）
      const batchSize = 10;
      const batches: AddressEntry[][] = [];
      
      for (let i = 0; i < parsedEntries.length; i += batchSize) {
        batches.push(parsedEntries.slice(i, i + batchSize));
      }
      
      const allResults: TransactionResult[] = [];
      
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex++) {
        const batch = batches[batchIndex];
        const recipients = batch.map(entry => entry.address);
        const firstAmount = batch[0].amount; // バッチ内の最初のアドレスの金額を使用
        
        // プログレスアップデート
        setSnackbarMessage(
          `Processing batch ${batchIndex + 1}/${batches.length}... Please approve in your wallet.`
        );
        
        // 転送実行
        const results = await transfer({
          recipients,
          amount: firstAmount,
          mint: selectedToken === "SOL" ? undefined : selectedToken
        });
        
        // バッチ結果をフォーマット
        const formattedResults: TransactionResult[] = results.map((result) => ({
          signature: result.signature,
          status: result.status,
          timestamp: result.timestamp || Date.now(),
          error: result.error,
          recipients: result.recipients || [],
          amount: firstAmount,
          token: selectedToken,
        }));
        
        allResults.push(...formattedResults);
        
        // バッチ間の遅延
        if (batchIndex < batches.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
      
      // 全トランザクション結果を更新
      setTransactionResults(prev => [...allResults, ...prev]);
  
      // 成功/失敗フィードバック
      const successCount = allResults.filter(r => r.status === 'success').length;
      if (successCount > 0) {
        setSnackbarMessage(`Successfully transferred to ${successCount} out of ${parsedEntries.length} recipients`);
      } else {
        setSnackbarMessage(`Transfer failed. Check transaction details for more information.`);
      }
      setSnackbarOpen(true);
  
    } catch (error) {
      console.error("Transfer failed:", error);
      setSnackbarMessage(`Transfer failed: ${(error as Error).message}`);
      setSnackbarOpen(true);
    }
  };

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

          {/* Token List - 改善版 */}
          <TokenList 
            publicKey={publicKey} 
            ref={tokenListRef}
          />

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
                  {getTokenAccountsForSelection().map((account) => (
                    <MenuItem key={account.mint} value={account.mint}>
                      {account.mint.slice(0, 4)}...{account.mint.slice(-4)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {/* Recipient Addresses with Amounts */}
              <Box mb={3}>
                <Typography variant="body2" fontWeight="bold" mb={1}>
                  {t("Recipient Addresses and Amounts")}
                </Typography>
                <Typography variant="caption" color="text.secondary" mb={1} display="block">
                  Format: address,amount (one entry per line)
                </Typography>
                <Box position="relative">
                  <TextField
                    multiline
                    rows={10}
                    fullWidth
                    value={recipientAddresses}
                    onChange={(e) => setRecipientAddresses(e.target.value)}
                    placeholder="BZsKiYDM3V71cJGnCTQV6As8G2hh6QiKEx65px8oATwz,1.822817"
                    error={invalidEntries.length > 0 || duplicateAddresses.length > 0}
                    helperText={
                      invalidEntries.length > 0
                        ? `Invalid entries: ${invalidEntries.length}`
                        : duplicateAddresses.length > 0
                        ? `Duplicate addresses: ${duplicateAddresses.length}`
                        : ""
                    }
                  />
                  <IconButton
                    onClick={pasteAddresses}
                    sx={{ position: "absolute", top: 8, right: 18 }}
                  >
                    <ContentPaste />
                  </IconButton>
                </Box>
                <Box
                  position="relative"
                  display="flex"
                  justifyContent="space-between"
                  alignItems="center"
                  mt={1}
                >
                  <Typography variant="caption" color="gray">
                    {t("Valid entries")}: {parsedEntries.length}
                  </Typography>
                  <UploadButton onRecipientsLoaded={handleRecipientsLoaded} />
                </Box>
                <Typography variant="caption" color="primary" fontWeight="bold" display="block" textAlign="right">
                  {t("Total amount")}: {totalAmount.toFixed(6)} {selectedToken === "SOL" ? "SOL" : "tokens"}
                </Typography>
              </Box>  

              {/* Transfer Button */}
              <Button
                variant="contained"
                color="primary"
                fullWidth
                onClick={handleTransfer}
                disabled={!connected || transferring || parsedEntries.length === 0 || invalidEntries.length > 0 || duplicateAddresses.length > 0}
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
                            {result.recipients.length > 1 ? ` x ${result.recipients.length} ${t("recipients")}` : ''}
                          </Typography>
                          {result.recipients.length > 1 && (
                            <Typography variant="body2" color="primary">
                              Total: {(result.amount * result.recipients.length).toFixed(6)}{" "}
                              {result.token === "SOL" ? "SOL" : "tokens"}
                            </Typography>
                          )}
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