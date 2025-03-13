// メインのSenderコンポーネント（SPLトークン選択改善版）
import { ContentPaste, Download } from '@mui/icons-material';
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
  ListItemText,
  ListItemAvatar,
  Tooltip,
} from '@mui/material';
import React, { useState, useEffect, useCallback, useRef } from 'react';

// カスタムフックのインポート
import { useTranslation } from 'react-i18next';

// ヘッダーコンポーネント
import SerializerList from '../../components/SerializerList';
import TokenList, {
  TokenListRef,
  TokenWithMetadata,
} from '../../components/TokenList';
import UploadButton from '../../components/UploadButton';
import WalletAddressDisplay from '../../components/WalletAddressDisplay';
import { useBalance } from '../../hooks/useBalance';
import { useConnection } from '../../hooks/useConnection';
import { useTokenTransfer } from '../../hooks/useTokenTransfer';
import { useWallet } from '../../hooks/useWallet';
import { useWalletAddressValidation } from '../../hooks/useWalletAddressValidation';
import {
  TransactionResult,
  AddressEntry,
  Serializer,
} from '../../types/transactionTypes';

// SOL Validation Amount import
const SOL_VALIDATION_AMOUNT = import.meta.env.VITE_DEPOSIT_MINIMUMS_SOL_AMOUNT;
console.log('SOL_VALIDATION_AMOUNT:', SOL_VALIDATION_AMOUNT);

// CSVからインポートされた受取人情報
interface Recipient {
  walletAddress: string;
  amount: number;
}

const Sender: React.FC = () => {
  // Hooks
  const { connection } = useConnection();
  const { publicKey, connected } = useWallet();
  const { balance, loading: loadingSol } = useBalance(connection, publicKey);
  const { transferWithIndividualAmounts, loading: transferring } =
    useTokenTransfer(connection, publicKey);
  const { t } = useTranslation(); // 翻訳フック
  const { isValidSolanaAddress } = useWalletAddressValidation();

  // TokenList から公開される関数を利用するための参照
  const tokenListRef = useRef<TokenListRef>(null);

  // Local state
  const [selectedToken, setSelectedToken] = useState<string>('SOL');
  const [recipientAddresses, setRecipientAddresses] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [transactionResults, setTransactionResults] = useState<
    TransactionResult[]
  >([]);
  const [allSerializer, setAllSerializer] = useState<Serializer[]>([]); // 全送信履歴
  const [invalidEntries, setInvalidEntries] = useState<string[]>([]);
  const [duplicateAddresses, setDuplicateAddresses] = useState<string[]>([]);
  const [parsedEntries, setParsedEntries] = useState<AddressEntry[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [belowMinSolEntries, setBelowMinSolEntries] = useState<string[]>([]);

  // メタデータ付きトークンを保持する状態
  const [tokensWithMetadata, setTokensWithMetadata] = useState<
    TokenWithMetadata[]
  >([]);
  // トークンリストのロード状態
  const [tokensLoading, setTokensLoading] = useState(true);

  // 最後にパースした内容を保持して不要な再パースを防止
  const lastParsedAddressesRef = useRef<string>('');

  // トークンメタデータを含むトークンアカウントを取得する関数 (明示的に実行)
  const fetchTokensWithMetadata = useCallback(async () => {
    if (!tokenListRef.current) return [];

    setTokensLoading(true);
    try {
      console.log('Explicitly fetching token metadata in Sender.tsx');
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
  }, []);

  // TokenListからのデータロード完了時のコールバック
  const handleTokenDataLoaded = useCallback((tokens: TokenWithMetadata[]) => {
    console.log(`Token data loaded callback: ${tokens.length} tokens received`);
    setTokensWithMetadata(tokens);
    setTokensLoading(false);
  }, []);

  // コンポーネントマウント時にトークンメタデータを取得
  useEffect(() => {
    if (connected && publicKey) {
      // ウォレット接続時に明示的にトークンデータを取得
      fetchTokensWithMetadata();
    }
  }, [connected, publicKey, fetchTokensWithMetadata]);

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
    // SOL最小額チェック用の配列
    const belowMinimumSolLines: string[] = [];

    // 最小SOL額の取得（設定されていない場合は0を使用）
    const minSolAmount = parseFloat(SOL_VALIDATION_AMOUNT) || 0;

    // 各行を解析
    const lines = recipientAddresses
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    for (const line of lines) {
      const parts = line.split(',').map((part) => part.trim());
      const address = parts[0];
      const amountStr = parts[1];

      // アドレスとアマウントの検証
      if (
        !address ||
        !isValidSolanaAddress(address) ||
        !amountStr ||
        isNaN(parseFloat(amountStr))
      ) {
        invalidLines.push(line);
        continue;
      }

      const amount = parseFloat(amountStr);

      // SOL選択時の最小額チェック
      if (
        selectedToken === 'SOL' &&
        amount < minSolAmount &&
        minSolAmount > 0
      ) {
        belowMinimumSolLines.push(line);
        // 最小額未満でもエントリには追加して、後で警告を表示できるようにする
      }

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

    // SOL最小額チェックの結果を状態に追加
    // 新しい状態を追加: belowMinSolEntries
    setBelowMinSolEntries(belowMinimumSolLines);

    // 合計金額を計算
    const sum = entries.reduce((total, entry) => total + entry.amount, 0);
    setTotalAmount(sum);
  }, [
    recipientAddresses,
    isValidSolanaAddress,
    selectedToken,
    SOL_VALIDATION_AMOUNT,
  ]);

  // recipientAddressesが変更されたときにだけパースを実行
  useEffect(() => {
    parseAddressEntries();
  }, [recipientAddresses, parseAddressEntries]);

  // CSVからのインポート処理
  const handleRecipientsLoaded = useCallback((recipients: Recipient[]) => {
    // CSVからインポートされた受取人情報を変換して設定
    const formattedAddresses = recipients
      .map((r) => `${r.walletAddress},${r.amount}`)
      .join('\n');

    // テキストフィールドを更新
    setRecipientAddresses(formattedAddresses);
  }, []);

  const pasteAddresses = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipientAddresses((prev) =>
        prev.length > 0 ? prev + '\n' + text : text
      );
    } catch (err) {
      console.error('Failed to read clipboard:', err);
    }
  };

  // handleTransfer 関数（修正版）
  const handleTransfer = async () => {
    // ウォレット接続チェック
    if (!connected || !publicKey) {
      setSnackbarMessage('Please connect your wallet');
      setSnackbarOpen(true);
      return;
    }

    if (parsedEntries.length === 0) {
      setSnackbarMessage('No valid recipient addresses found');
      setSnackbarOpen(true);
      return;
    }

    // 妥当性エラーがある場合は処理中止
    if (invalidEntries.length > 0 || duplicateAddresses.length > 0) {
      setSnackbarMessage(
        invalidEntries.length > 0
          ? 'Please correct invalid entries'
          : 'Please correct duplicate addresses'
      );
      setSnackbarOpen(true);
      return;
    }

    // TokenListから最新のトークンアカウント情報を取得
    // まずトークンが読み込まれていることを確認
    let tokens = tokensWithMetadata;
    if (tokens.length === 0 && selectedToken !== 'SOL') {
      try {
        tokens = await fetchTokensWithMetadata();
      } catch (err) {
        console.error('Failed to fetch tokens before transfer:', err);
      }
    }

    // 残高チェック
    if (selectedToken === 'SOL') {
      // SOLの残高チェック
      if (balance && totalAmount > balance) {
        setSnackbarMessage(
          `Insufficient SOL balance. Required: ${totalAmount.toFixed(6)}, Available: ${balance.toFixed(6)}`
        );
        setSnackbarOpen(true);
        return;
      }
    } else {
      // トークンの残高チェック
      const selectedTokenInfo = tokens.find(
        (token) => token.account.mint === selectedToken
      );
      if (!selectedTokenInfo) {
        setSnackbarMessage('Selected token information not found');
        setSnackbarOpen(true);
        return;
      }

      if (totalAmount > selectedTokenInfo.account.uiAmount) {
        setSnackbarMessage(
          `Insufficient token balance. Required: ${totalAmount.toFixed(6)}, Available: ${selectedTokenInfo.account.uiAmount.toFixed(6)}`
        );
        setSnackbarOpen(true);
        return;
      }
    }

    try {
      // 転送処理中メッセージ
      setSnackbarMessage(
        'Processing transfers... Please wait and approve transaction in your wallet.'
      );
      setSnackbarOpen(true);

      // 選択されたトークンの表示名を取得
      let tokenDisplayName = 'SOL';
      if (selectedToken !== 'SOL') {
        const tokenInfo = tokens.find((t) => t.account.mint === selectedToken);
        tokenDisplayName =
          tokenInfo?.metadata?.symbol ||
          selectedToken.slice(0, 4) + '...' + selectedToken.slice(-4);
      }

      const now: number = Date.now();

      // トランザクション送信 & 検証 & サーバーに保存
      const results = await transferWithIndividualAmounts(
        parsedEntries.map((entry) => ({
          address: entry.address,
          amount: entry.amount,
        })),
        selectedToken === 'SOL' ? undefined : selectedToken,
        now
      );

      // 結果をフォーマット
      const formattedResults: TransactionResult[] = results.result.map(
        (result) => {
          // バッチ処理された結果から適切な情報を抽出
          const recipientAddresses = result.recipients || [];

          // この結果に含まれるすべての受取人に対する送金額を収集
          const recipientAmounts = recipientAddresses.map((addr) => {
            const entry = parsedEntries.find((e) => e.address === addr);
            return entry ? entry.amount : 0;
          });

          // 合計金額を計算（複数受取人の場合）
          const totalBatchAmount = recipientAmounts.reduce(
            (sum, amount) => sum + amount,
            0
          );

          return {
            signature: result.signature,
            status: result.status,
            timestamp: result.timestamp || Date.now(),
            error: result.error,
            errorMessage: result.errorMessage,
            recipients: recipientAddresses.map((addr, idx) => ({
              address: addr,
              amount: recipientAmounts[idx],
            })),
            // 受取人が1人の場合はその金額、複数の場合は配列に含まれる値
            amount:
              recipientAddresses.length === 1
                ? recipientAmounts[0]
                : totalBatchAmount / recipientAddresses.length,
            token: tokenDisplayName,
            totalAmount: totalBatchAmount,
            // 追加フィールド: このバッチに含まれるすべての受取人と金額
            recipientDetails: recipientAddresses.map((addr, idx) => ({
              address: addr,
              amount: recipientAmounts[idx],
            })),
          };
        }
      );

      // 全トランザクション結果を更新
      setTransactionResults((prev) => [...formattedResults, ...prev]);

      setAllSerializer((prev) => [
        // 前の状態の要素をすべて展開
        ...prev,
        // 新しいオブジェクトを追加
        {
          results: formattedResults, // 新しい結果
          uuid: results.uuid, // 一意の識別子,
          timestamp: new Date(now).toISOString(), // ISO形式の日付文字列
          senderWallet: publicKey?.toString() || '', // 送信者のウォレットアドレス
          tokenType: selectedToken === 'SOL' ? 'SOL' : 'spl', // トークンタイプ
          tokenSymbol: selectedTokenInfo.symbol, // トークンシンボル
          tokenMintAddress: selectedToken === 'SOL' ? 'SOL' : selectedToken, // トークンのミントアドレス
        },
      ]);

      // 成功/失敗フィードバック
      const successCount = formattedResults.reduce(
        (count, result) =>
          result.status === 'success'
            ? count + result.recipients.length
            : count,
        0
      );

      if (successCount > 0) {
        setSnackbarMessage(
          `Successfully transferred to ${successCount} out of ${parsedEntries.length} recipients`
        );
      } else {
        setSnackbarMessage(
          `Transfer failed. Check transaction details for more information.`
        );
      }
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Transfer failed:', error);
      setSnackbarMessage(`Transfer failed: ${(error as Error).message}`);
      setSnackbarOpen(true);
    }
  };

  // 選択されたトークンの情報を取得
  const getSelectedTokenInfo = useCallback(() => {
    if (selectedToken === 'SOL') {
      return {
        symbol: 'SOL',
        name: 'Solana',
        mint: 'SOL',
        icon: '/solana-icon.png', // SOLアイコンのパス
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
    };
  }, [selectedToken, tokensWithMetadata]);

  // 選択中のトークン情報
  const selectedTokenInfo = getSelectedTokenInfo();

  // トークンリストがロード中かどうか
  const isTokenListLoading =
    tokensLoading || (tokenListRef.current?.isLoading() ?? false);

  // テンプレートダウンロード関数を追加
  const downloadTemplate = () => {
    const template =
      'wallet_address,amount\nBZsKiYDM3V71cJGnCTQV6As8G2hh6QiKEx65px8oATwz,1.822817\nBv938nFFBFRe8rFEqVQMC77jKQiuBybfh6W51KMLHtKh,0.006547';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 8vh - 8vh)', // ヘッダー(6vh)とフッター(8vh)引く
        backgroundImage: `url("../../../public/image.webp")`,
        backgroundSize: '120%',
        backgroundPosition: '0% 80%',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      <Container maxWidth="md">
        {/* Wallet Connection Warning */}
        {!connected && (
          <Card sx={{ mt: 2, p: 3, borderRadius: 2, bgcolor: '#ffffff' }}>
            <Typography
              variant="h4"
              sx={{
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#000000',
              }}
            >
              {t('Please connect your wallet in the header')}
            </Typography>
          </Card>
        )}

        {/* SOL Balance & Address */}
        <Card sx={{ my: 4 }}>
          <CardContent>
            <Typography variant="h6" mb={2} textAlign="center">
              {t('SOL Balance')}
            </Typography>
            {!connected ? (
              <Typography
                variant="h4"
                fontWeight="bold"
                color="text.secondary"
                textAlign="center"
              >
                0.00000000 SOL
              </Typography>
            ) : loadingSol ? (
              <Box textAlign="center" p={2}>
                <CircularProgress size={24} />
              </Box>
            ) : (
              <Typography
                variant="h4"
                fontWeight="bold"
                color="green"
                textAlign="center"
              >
                {balance?.toFixed(8) ?? '0.00000000'} SOL
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />

            <WalletAddressDisplay />
          </CardContent>
        </Card>

        {/* Token List - 改善版 */}
        {connected ? (
          <TokenList
            publicKey={publicKey}
            ref={tokenListRef}
            onDataLoaded={handleTokenDataLoaded}
          />
        ) : (
          <Card sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" textAlign="center">
                {t('SPL Tokens')}
              </Typography>
              <Box textAlign="center" p={2}>
                {t('No SPL tokens found')}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Transfer Form */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" textAlign="center" mb={2}>
              {t('Token Transfer')}
            </Typography>

            {/* Token Selection - 改善版 */}
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>{t('Select Token')}</InputLabel>
              <Select
                value={selectedToken}
                label={t('Select Token')}
                onChange={(e) => setSelectedToken(e.target.value)}
                renderValue={() => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      src={selectedTokenInfo.icon}
                      alt={selectedTokenInfo.symbol}
                      sx={{ width: 24, height: 24 }}
                    />
                    <Typography>
                      {selectedTokenInfo.symbol} - {selectedTokenInfo.name}
                    </Typography>
                  </Box>
                )}
              >
                <MenuItem value="SOL">
                  <ListItemAvatar>
                    <Avatar
                      src="/solana-icon.png"
                      alt="SOL"
                      sx={{ width: 24, height: 24 }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary="SOL - Solana"
                    secondary="Native Token"
                  />
                </MenuItem>

                {/* トークンのロード状態表示 */}
                {isTokenListLoading ? (
                  <MenuItem disabled>
                    <Box display="flex" alignItems="center" py={1}>
                      <CircularProgress size={20} sx={{ mr: 2 }} />
                      <Typography>Loading tokens...</Typography>
                    </Box>
                  </MenuItem>
                ) : tokensWithMetadata.length === 0 ? (
                  <MenuItem disabled>
                    <Typography color="text.secondary">
                      No SPL tokens found
                    </Typography>
                  </MenuItem>
                ) : (
                  tokensWithMetadata.map((token) => (
                    <MenuItem
                      key={token.account.mint}
                      value={token.account.mint}
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={token.metadata?.uri || '/token-placeholder.png'}
                          alt={token.metadata?.symbol || 'Token'}
                          sx={{ width: 24, height: 24 }}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${token.metadata?.symbol || 'Unknown'} - ${token.metadata?.name || 'Unknown Token'}`}
                        secondary={`${token.account.mint.slice(0, 6)}...${token.account.mint.slice(-6)}`}
                      />
                    </MenuItem>
                  ))
                )}

                {/* トークンデータ手動更新ボタン */}
                {connected && (
                  <MenuItem
                    onClick={(e) => {
                      e.preventDefault();
                      fetchTokensWithMetadata();
                    }}
                    sx={{
                      color: 'primary.main',
                      borderTop: '1px solid rgba(0,0,0,0.1)',
                    }}
                  >
                    <Box
                      display="flex"
                      alignItems="center"
                      width="100%"
                      justifyContent="center"
                    >
                      <Typography fontWeight="bold">
                        {isTokenListLoading
                          ? 'Refreshing...'
                          : 'Refresh token list'}
                      </Typography>
                      {isTokenListLoading && (
                        <CircularProgress size={16} sx={{ ml: 1 }} />
                      )}
                    </Box>
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {/* Recipient Addresses with Amounts */}
            <Box mb={3}>
              <Typography variant="body2" fontWeight="bold" mb={1}>
                {t('Recipient Addresses and Amounts')}
                <br />
                {t(
                  'Solana transfers support a maximum of 8 decimal places, exceeding which will result in failure.'
                )}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                mb={1}
                display="block"
              >
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
                  error={
                    invalidEntries.length > 0 ||
                    duplicateAddresses.length > 0 ||
                    (selectedToken === 'SOL' && belowMinSolEntries.length > 0)
                  }
                  helperText={
                    invalidEntries.length > 0
                      ? `Invalid entries: ${invalidEntries.length}`
                      : duplicateAddresses.length > 0
                        ? `Duplicate addresses: ${duplicateAddresses.length}`
                        : selectedToken === 'SOL' &&
                            belowMinSolEntries.length > 0
                          ? `${belowMinSolEntries.length} entries below minimum SOL amount (${SOL_VALIDATION_AMOUNT})`
                          : ''
                  }
                />
                <Tooltip title="Paste" arrow placement="top">
                  <IconButton
                    onClick={pasteAddresses}
                    sx={{ position: 'absolute', top: 8, right: 18 }}
                  >
                    <ContentPaste />
                    <Typography
                      variant="caption"
                      sx={{
                        position: 'absolute',
                        bottom: -5.0,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        fontSize: '0.6rem',
                      }}
                    >
                      Paste
                    </Typography>
                  </IconButton>
                </Tooltip>
              </Box>
              <Box
                position="relative"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mt={1}
              >
                <Typography variant="caption" color="gray">
                  {t('Valid entries')}: {parsedEntries.length}
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                  <Tooltip title="download" arrow placement="top">
                    <Button
                      onClick={downloadTemplate}
                      size="small"
                      startIcon={<Download fontSize="small" />}
                      sx={{
                        textTransform: 'none',
                        color: 'inherit',
                        minWidth: 'auto',
                        padding: '4px 8px',
                        fontSize: '0.75rem',
                      }}
                    >
                      {t('template')}
                    </Button>
                  </Tooltip>
                  <Tooltip title="upload" arrow placement="top">
                    <Box>
                      <UploadButton
                        onRecipientsLoaded={handleRecipientsLoaded}
                      />
                    </Box>
                  </Tooltip>
                </Box>
              </Box>
              <Typography
                variant="caption"
                color="primary"
                fontWeight="bold"
                display="block"
                textAlign="right"
              >
                {t('Total amount')}: {totalAmount.toFixed(6)}{' '}
                {selectedTokenInfo.symbol}
              </Typography>
            </Box>

            {/* Token simulation */}
            <Box mb={3}>
              <Typography variant="body2" fontWeight="bold" mb={2}>
                {t('Transaction Simulation')}
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' },
                  gap: 2,
                }}
              >
                {/* 全てのBoxに共通のスタイルを適用 */}
                {[
                  {
                    title: 'Total Addresses',
                    value: parsedEntries.length,
                  },
                  {
                    title: 'Total Token Sent',
                    value: totalAmount.toFixed(3),
                    subText: `${t('Service Fee')}: 0.008SOL`,
                  },
                  {
                    title: 'Total Transactions',
                    value: Math.ceil(parsedEntries.length / 9),
                  },
                  {
                    title: 'SOL Balance',
                    value: balance?.toFixed(3) ?? '0.000',
                  },
                ].map((item, index) => (
                  <Box
                    key={index}
                    sx={{
                      background:
                        'linear-gradient(135deg, rgba(120, 193, 253, 0.15) 0%, rgba(255, 255, 255, 0.9) 100%)',
                      borderRadius: 2,
                      p: 2,
                      textAlign: 'center',
                      border: '1px solid rgba(120, 193, 253, 0.3)',
                      boxShadow: '0 2px 8px rgba(120, 193, 253, 0.1)',
                      transition: 'all 0.2s ease',
                      position: 'relative',
                      overflow: 'hidden',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: '100%',
                        height: '100%',
                        background:
                          'linear-gradient(135deg, rgba(120, 193, 253, 0.1) 0%, rgba(255, 255, 255, 0.05) 100%)',
                        opacity: 0,
                        transition: 'opacity 0.2s ease',
                      },
                      '&:hover': {
                        boxShadow: '0 4px 12px rgba(120, 193, 253, 0.15)',
                        transform: 'translateY(-2px)',
                        '&::before': {
                          opacity: 1,
                        },
                      },
                    }}
                  >
                    <Typography
                      variant="h4"
                      fontWeight="bold"
                      color="rgb(0, 0, 0)"
                    >
                      {item.value}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {t(item.title)}
                    </Typography>
                    {item.subText && (
                      <Typography variant="caption" color="text.secondary">
                        {item.subText}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>
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
                parsedEntries.length === 0 ||
                invalidEntries.length > 0 ||
                duplicateAddresses.length > 0 ||
                (selectedToken === 'SOL' && belowMinSolEntries.length > 0)
              }
            >
              {transferring ? (
                <>
                  <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} />
                  {t('Processing')}...
                </>
              ) : (
                t('Transfer')
              )}
            </Button>
            <Typography
              variant="caption"
              color="text.secondary"
              mt={1}
              textAlign="center"
              display="block"
            >
              {t(
                'The lowest across the network, each transaction only requires 0.0075 SOL.'
              )}
            </Typography>

            {/* Transaction Results */}
            {allSerializer.length > 0 && (
              <Box mt={3}>
                <Typography variant="h6" gutterBottom>
                  {t('Recent Transactions')}
                </Typography>
                {allSerializer.map((serializer, index) => (
                  <SerializerList
                    key={`${serializer.uuid}-${index}`}
                    serializer={serializer}
                    connection={connection}
                  />
                ))}
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
