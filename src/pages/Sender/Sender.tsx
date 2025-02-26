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
  InputAdornment,
} from "@mui/material";
import { ContentPaste, ContentCopy, OpenInNew } from "@mui/icons-material";

// カスタムフックのインポート
import { useWallet } from "../../hooks/useWallet";
import { useConnection } from "../../hooks/useConnection";
import { useBalance } from "../../hooks/useBalance";
import { useTokenAccounts } from "../../hooks/useTokenAccounts";
import { useTokenMetadata } from "../../hooks/useTokenMetadata";
import { useTokenTransfer } from "../../hooks/useTokenTransfer";
import { useWalletAddressValidation } from '../../hooks/useWalletAddressValidation';

// ヘッダーコンポーネント
import Header from "../../components/Header";

// インターフェース定義
interface TransactionResult {
  signature: string;
  status: 'success' | 'error';
  timestamp: number;
  error?: string;
  recipients: string[];
  amount: number;
  token: string;
}

interface TokenDisplayProps {
  account: {
    mint: string;
    uiAmount: number;
  };
}

// トークン表示用コンポーネント
const TokenDisplay: React.FC<TokenDisplayProps> = ({ account }) => {
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
          {/* 
          {metadata?.uri && (
            <Typography variant="caption" display="block" color="text.secondary">
              URI: {metadata.uri}
            </Typography>
          )}
            */}
        </Box>
      </Box>
      <Typography variant="body2" fontWeight="bold">
        {account.uiAmount} {metadata?.symbol || ""}
      </Typography>
    </Box>
  );
};

// メインのSenderコンポーネント
const Sender: React.FC = () => {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected, walletInfo } = useWallet();
  const { balance, loading: loadingSol } = useBalance(connection, publicKey);
  const { accounts: tokenAccounts, loading: loadingTokens } = useTokenAccounts(connection, publicKey);
  const { transfer, loading: transferring } = useTokenTransfer(connection, publicKey);
  const { validateAddresses } = useWalletAddressValidation();

  // Local state
  const [selectedToken, setSelectedToken] = useState<string>("SOL");
  const [recipientAddresses, setRecipientAddresses] = useState<string>("");
  const [transferAmount, setTransferAmount] = useState<number>(0);
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState("");
  const [transactionResults, setTransactionResults] = useState<TransactionResult[]>([]);
  const [invalidAddresses, setInvalidAddresses] = useState<string[]>([]);
  const [duplicateAddresses, setDuplicateAddresses] = useState<string[]>([]);

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
    // ウォレット接続チェック
    if (!connected || !publicKey) {
      setSnackbarMessage("Please connect your wallet");
      setSnackbarOpen(true);
      return;
    }
   
    // 受取人アドレスとAmountを準備
    const addressEntries = recipientAddresses
      .split('\n')
      .map(line => {
        const [address, amount] = line.split(',').map(part => part.trim());
        return { 
          address, 
          amount: parseFloat(amount || '0') 
        };
      })
      .filter(item => item.address.length > 0);
   
    // アドレスの妥当性検証
    const { 
      validAddresses, 
      invalidAddresses: invalidList, 
      duplicateAddresses: duplicateList 
    } = validateAddresses(addressEntries.map(entry => entry.address));
   
    // 検証エラーの状態設定
    setInvalidAddresses(invalidList);
    setDuplicateAddresses(duplicateList);
   
    // 妥当性エラーがある場合は処理中止
    if (invalidList.length > 0 || duplicateList.length > 0) {
      setSnackbarMessage("Please correct invalid or duplicate addresses");
      setSnackbarOpen(true);
      return;
    }
   
    // 転送総額の計算
    const totalAmount = addressEntries
      .filter(entry => validAddresses.includes(entry.address))
      .reduce((sum, entry) => sum + entry.amount, 0);
   
    // 残高チェック
    try {
      if (selectedToken === "SOL") {
        // SOLの残高チェック
        if (balance && totalAmount > balance) {
          setSnackbarMessage(`Insufficient SOL balance. Required: ${totalAmount}, Available: ${balance}`);
          setSnackbarOpen(true);
          return;
        }
      } else {
        // トークンの残高チェック
        const selectedTokenAccount = tokenAccounts.find(account => account.mint === selectedToken);
        if (!selectedTokenAccount || totalAmount > selectedTokenAccount.uiAmount) {
          setSnackbarMessage(`Insufficient token balance. Required: ${totalAmount}, Available: ${selectedTokenAccount?.uiAmount || 0}`);
          setSnackbarOpen(true);
          return;
        }
      }
   
      // 転送処理中メッセージ
      setSnackbarMessage("Processing transfers... Please approve in your wallet");
      setSnackbarOpen(true);
   
      // 転送実行
      const results = await transfer({
        recipients: validAddresses,
        amount: addressEntries
          .filter(entry => validAddresses.includes(entry.address))
          .map(entry => entry.amount)[0], // 最初のエントリーのamountを使用
        mint: selectedToken === "SOL" ? undefined : selectedToken
      });
   
      // トランザクション結果の更新
      setTransactionResults(prev => [
        ...results.map(result => ({
          ...result,
          token: selectedToken,
          amount: totalAmount
        })),
        ...prev
      ]);
   
      // 成功/失敗フィードバック
      const successCount = results.filter(r => r.status === 'success').length;
      setSnackbarMessage(`Transferred to ${successCount} out of ${validAddresses.length} recipients`);
      setSnackbarOpen(true);
   
    } catch (error) {
      console.error("Transfer failed:", error);
      setSnackbarMessage(`Transfer failed: ${(error as Error).message}`);
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
                  rows={30}
                  fullWidth
                  value={recipientAddresses}
                  onChange={(e) => {
                    const value = e.target.value;
                    setRecipientAddresses(value);
                    
                    // アドレスとAmountを同時にバリデーション
                    const addresses = value
                      .split('\n')
                      .map(line => {
                        const [address, amount] = line.split(',').map(part => part.trim());
                        return { address, amount: parseFloat(amount || '0') };
                      })
                      .filter(item => item.address.length > 0);
                    
                    const { 
                      validAddresses, 
                      invalidAddresses: invalidList, 
                      duplicateAddresses: duplicateList 
                    } = validateAddresses(addresses.map(item => item.address));
                    
                    setInvalidAddresses(invalidList);
                    setDuplicateAddresses(duplicateList);
                  }}
                  placeholder="Enter Solana addresses and amounts (address,amount per line)"
                  error={invalidAddresses.length > 0 || duplicateAddresses.length > 0}
                  helperText={
                    <>
                      {invalidAddresses.length > 0 && `Invalid addresses: ${invalidAddresses.join(', ')}`}
                      {duplicateAddresses.length > 0 && (
                        <>
                          {invalidAddresses.length > 0 && <br />}
                          {`Duplicate addresses: ${duplicateAddresses.join(', ')}`}
                        </>
                      )}
                    </>
                  }
                  InputProps={{
                    inputComponent: 'textarea',
                    inputProps: {
                      style: {
                        resize: 'vertical',
                        overflow: 'auto',
                        wordWrap: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }
                    },
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton onClick={pasteAddresses}>
                          <ContentPaste />
                        </IconButton>
                      </InputAdornment>
                    )
                  }}
                  sx={{
                    '& .MuiInputBase-input': {
                      color: (theme) => theme.palette.text.primary,
                      '& ::selection': {
                        backgroundColor: 'rgba(255, 0, 0, 0.1)'
                      }
                    },
                    '& textarea': {
                      '&::selection': {
                        backgroundColor: 'rgba(255, 0, 0, 0.1)'
                      }
                    }
                  }}
                />
              </Box>
              <Typography variant="caption" color="gray">
                Entries: {
                  recipientAddresses
                    .split('\n')
                    .filter(line => line.trim().length > 0)
                    .length
                }
                {invalidAddresses.length > 0 && (
                  <span style={{ color: 'red', marginLeft: '10px' }}>
                    Invalid addresses: {invalidAddresses.length}
                  </span>
                )}
                {duplicateAddresses.length > 0 && (
                  <span style={{ color: 'red', marginLeft: '10px' }}>
                    Duplicate addresses: {duplicateAddresses.length}
                  </span>
                )}
              </Typography>
            </Box>

            {/* Transfer Button */}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              onClick={handleTransfer}
              disabled={
                !connected || 
                transferring || 
                recipientAddresses
                  .split('\n')
                  .map(line => {
                    const [address, amount] = line.split(',').map(part => part.trim());
                    return { address, amount: parseFloat(amount || '0') };
                  })
                  .filter(item => item.address.length > 0).length === 0 || 
                (recipientAddresses
                  .split('\n')
                  .map(line => {
                    const [address, amount] = line.split(',').map(part => part.trim());
                    return { address, amount: parseFloat(amount || '0') };
                  })
                  .filter(item => item.address.length > 0)
                  .some(item => isNaN(item.amount) || item.amount <= 0)
                )}
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

            {/* Transaction Results */}
            {transactionResults.length > 0 && (
              <Box mt={3}>
                <Typography variant="h6" gutterBottom>
                  Recent Transactions
                </Typography>
                <List>
                  {transactionResults.map((result, index) => (
                    <ListItem
                      key={`${result.signature}-${index}`}
                      sx={{
                        bgcolor: '#f5f5f5',
                        borderRadius: 1,
                        mb: 1,
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                        p: 2,
                      }}
                    >
                      {/* Status and Timestamp */}
                      <Box display="flex" alignItems="center" width="100%" mb={1}>
                        <Chip
                          label={result.status}
                          color={result.status === 'success' ? 'success' : 'error'}
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
                          width: '100%',
                          mb: 1,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          bgcolor: 'rgba(0, 0, 0, 0.03)',
                          borderRadius: 1,
                          p: 1,
                        }}
                      >
                        <Typography variant="body2">
                          {result.amount} {result.token === "SOL" ? "SOL" : "tokens"}
                          {" x "}{result.recipients.length} recipients
                        </Typography>
                        <Typography variant="body2" color="primary">
                          Total: {result.amount * result.recipients.length} {result.token === "SOL" ? "SOL" : "tokens"}
                        </Typography>
                      </Box>
                      
                      {/* Signature with Copy and Link */}
                        <Box 
                          display="flex" 
                          alignItems="center" 
                          width="100%"
                          sx={{ wordBreak: 'break-all' }}
                        >
                          <ListItemText
                            primary={
                              <Link
                                href={`https://${connection.rpcEndpoint.includes('devnet') ? 'solscan.io/tx/' : 'solscan.io/tx/'}${result.signature}${connection.rpcEndpoint.includes('devnet') ? '?cluster=devnet' : ''}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ display: 'flex', alignItems: 'center' }}
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
                            width: '100%',
                            backgroundColor: 'error.light',
                            borderRadius: 1,
                            p: 1
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
  );
};

export default Sender;