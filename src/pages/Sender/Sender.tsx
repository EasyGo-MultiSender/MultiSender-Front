// メインのSenderコンポーネント（SPLトークン選択改善版）
import { ContentPaste, Download } from '@mui/icons-material';
import {
  Box,
  Container,
  Card,
  CardContent,
  Typography,
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
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
} from '@solana/spl-token';
import { PublicKey, Transaction } from '@solana/web3.js';
import React, { useState, useEffect, useCallback, useRef } from 'react';

// カスタムフックのインポート
import { useTranslation } from 'react-i18next';

// ヘッダーコンポーネント
import SerializerList from '@/components/SerializerList';
import TokenList, { TokenListRef } from '@/components/TokenList';
import UploadButton from '@/components/UploadButton';
import WalletAddressDisplay from '@/components/WalletAddressDisplay';
import { useBalance } from '@/hooks/useBalance';
import { useConnection } from '@/hooks/useConnection';
import { useRecaptcha } from '@/hooks/useRecaptcha';
import { useTokenListMetadata } from '@/hooks/useTokenListMetadata';
import { useTokenTransfer } from '@/hooks/useTokenTransfer';
import {
  createAccountInstruction,
  createInstruction,
  getOperationFee,
} from '@/hooks/useTransactionFeeSimulation.ts';
import { useWallet } from '@/hooks/useWallet';
import {
  useWalletAddressValidation,
  validationCSV,
} from '@/hooks/useWalletAddressValidation';
import { downloadTemplate } from '@/hooks/util/csv.ts';
import {
  TransactionResult,
  AddressEntry,
  Serializer,
} from '@/types/transactionTypes';
import { RecaptchaVerificationResult } from '@/hooks/useRecaptcha';
import { CSVValidationResult } from '@/hooks/interfaces/transfer.ts';
import COLORS from '@/constants/color';

// SOL Validation Amount import
const SOL_VALIDATION_AMOUNT = import.meta.env.VITE_DEPOSIT_MINIMUMS_SOL_AMOUNT;
console.log('SOL_VALIDATION_AMOUNT:', SOL_VALIDATION_AMOUNT);

const DEPOSIT_SOL_AMOUNT = import.meta.env.VITE_DEPOSIT_SOL_AMOUNT;

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
  // 処理メッセージを更新する関数
  const updateProcessingMessage = useCallback((message: string) => {
    setProcessingMessage(message);
  }, []);
  const { transferWithIndividualAmounts, loading: transferring } =
    useTokenTransfer(connection, publicKey, updateProcessingMessage);
  const { t } = useTranslation(); // 翻訳フック
  const { isValidSolanaAddress } = useWalletAddressValidation();
  const { getRecaptchaToken } = useRecaptcha(); // reCAPTCHA フック

  // TokenList から公開される関数を利用するための参照
  const tokenListRef = useRef<TokenListRef>(null);

  // 新しいトークンリストメタデータフック
  const {
    tokensWithMetadata,
    fetchTokensWithMetadata,
    handleTokenDataLoaded,
    isTokenListLoading: tokenListLoading,
    getTokenInfo,
  } = useTokenListMetadata(tokenListRef);

  // Local state
  const [selectedToken, setSelectedToken] = useState<string>('SOL');
  const [recipientAddresses, setRecipientAddresses] = useState<string>('');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [validationCSVResult, setValidationCSVResult] =
    useState<CSVValidationResult>({
      invalidLineNumbers: [],
      entries: [],
      duplicateLineNumbers: [],
      duplicates: [],
      belowMinimumSolLines: [],
      belowMinimumSolLineNumbers: [],
      invalidAddressNumbers: [],
      invalidSolNumbers: [],
    });
  const [transactionResults, setTransactionResults] = useState<
    TransactionResult[]
  >([]);
  const [allSerializer, setAllSerializer] = useState<Serializer[]>([]); // 全送信履歴
  const [invalidEntries, setInvalidEntries] = useState<number[]>([]);
  const [duplicateAddresses, setDuplicateAddresses] = useState<string[]>([]);
  const [parsedEntries, setParsedEntries] = useState<AddressEntry[]>([]);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [belowMinSolEntries, setBelowMinSolEntries] = useState<string[]>([]);
  const [transferLoading, setTransferLoading] = useState(false);
  const [processingMessage, setProcessingMessage] = useState<string>(
    t('Processing')
  ); // 処理中メッセージ

  // TokenAccountの存在確認結果を保持するstate
  const [accountsNeedingCreation, setAccountsNeedingCreation] = useState<
    string[]
  >([]);
  // 手数料情報を保持するstate
  const [feeEstimation, setFeeEstimation] = useState({
    totalFee: 0, // 合計手数料（SOL）
    accountCreationFees: 0, // アカウント作成にかかる手数料
    transactionFees: 0, // 通常トランザクション手数料
    operationFees: 0, // 運営手数料
    isLoading: false, // 計算中フラグ
    simulatedSuccess: false, // シミュレーション成功フラグ
    transactionFeeFallback: false, // トランザクション手数料がフォールバック値かどうか
    accountCreationFeeFallback: false, // アカウント作成手数料がフォールバック値かどうか
    totalFeeFallback: false, // 合計手数料がフォールバック値かどうか
    progress: {
      current: 0, // 現在処理中の項目番号
      total: 0, // 合計処理項目数
      step: '', // 現在の処理ステップ名
    },
  });

  const BATCH_SIZE =
    selectedToken === 'SOL'
      ? import.meta.env.VITE_SOL_TRANSFER_BATCH_SIZE
      : import.meta.env.VITE_SPL_TRANSFER_BATCH_SIZE;

  // 最後にパースした内容を保持して不要な再パースを防止
  const lastParsedAddressesRef = useRef<string>('');

  // 色付けする行番号の配列（例：[1, 3, 5]は1行目、3行目、5行目を赤くする）
  const [highlightedLines, setHighlightedLines] = useState<number[]>([2, 4]); // 例として2行目と4行目

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

    // validationCSVの結果を一度変数に格納する
    const validationResult = validationCSV(
      SOL_VALIDATION_AMOUNT,
      recipientAddresses,
      isValidSolanaAddress,
      selectedToken
    );

    // 結果を状態に設定
    setValidationCSVResult(validationResult);

    // 状態を更新（validationResultを使用）
    setInvalidEntries(validationResult.invalidLineNumbers);
    setParsedEntries(validationResult.entries);
    setDuplicateAddresses(validationResult.duplicates);

    // SOL最小額チェックの結果を状態に追加
    setBelowMinSolEntries(validationResult.belowMinimumSolLines);

    // エラー状態に基づいてハイライト行を更新
    const newHighlightedLines: number[] = [];
    if (validationResult.invalidLineNumbers.length > 0) {
      newHighlightedLines.push(...validationResult.invalidLineNumbers);
    }
    if (validationResult.duplicateLineNumbers.length > 0) {
      newHighlightedLines.push(...validationResult.duplicateLineNumbers);
    }
    if (
      selectedToken === 'SOL' &&
      validationResult.belowMinimumSolLineNumbers.length > 0
    ) {
      newHighlightedLines.push(...validationResult.belowMinimumSolLineNumbers);
    }

    // ハイライト行を更新
    setHighlightedLines(newHighlightedLines);

    // 合計金額を計算
    const sum = validationResult.entries.reduce(
      (total, entry) => total + entry.amount,
      0
    );
    setTotalAmount(sum);

    // 有効な行がなければ
    if (validationResult.entries.length === 0) {
      setFeeEstimation((prev) => ({
        ...prev,
        isLoading: false,
        transactionFees: 0,
        operationFees: 0,
        accountCreationFees: 0,
        totalFee: 0,
      }));
    }
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

  const [isPasted, setIsPasted] = useState(false);

  const pasteAddresses = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setRecipientAddresses((prev) =>
        prev.length > 0 ? prev + '\n' + text : text
      );
      setIsPasted(true);

      // 1秒後にisPastedをfalseに戻す
      setTimeout(() => {
        setIsPasted(false);
      }, 1000);
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

    setTransferLoading(true);
    try {
      // reCAPTCHA v3トークンを取得
      // setSnackbarMessage('reCAPTCHA検証中...');
      // setSnackbarOpen(true);
      let recaptchaResult: RecaptchaVerificationResult = {
        success: false,
        token: '',
        error: undefined,
      };

      if (import.meta.env.VITE_RECAPTCHA_ACTIVE === 'false') {
        recaptchaResult.success = true;
      } else {
        recaptchaResult = await getRecaptchaToken('transfer');
      }

      // reCAPTCHAの検証結果をチェック
      if (!recaptchaResult.success) {
        setSnackbarMessage(
          `reCAPTCHA検証に失敗しました: ${recaptchaResult.error || '不明なエラー'}`
        );
        setSnackbarOpen(true);
        setTransferLoading(false);
        return;
      }
    } catch (error) {
      console.error('reCAPTCHA error:', error);
      setSnackbarMessage(
        'reCAPTCHA検証に失敗しました。もう一度お試しください。'
      );
      setSnackbarOpen(true);
      setTransferLoading(false);
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
      setTransferLoading(false);
      return;
    }

    // TokenListから最新のトークンアカウント情報を取得
    updateProcessingMessage(t('Loading token information...'));
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
    updateProcessingMessage(t('Checking balances...'));
    if (selectedToken === 'SOL') {
      // SOLの残高チェック
      if (balance && totalAmount > balance) {
        setSnackbarMessage(
          `Insufficient SOL balance. Required: ${totalAmount.toFixed(6)}, Available: ${balance.toFixed(6)}`
        );
        setSnackbarOpen(true);
        setTransferLoading(false);
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
        setTransferLoading(false);
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
      updateProcessingMessage(t('Preparing transactions...'));
      let tokenDisplayName = 'SOL';
      if (selectedToken !== 'SOL') {
        const tokenInfo = tokens.find((t) => t.account.mint === selectedToken);
        tokenDisplayName =
          tokenInfo?.metadata?.symbol ||
          selectedToken.slice(0, 4) + '...' + selectedToken.slice(-4);
      }

      const now: number = Date.now();

      // トランザクション送信前の更新
      updateProcessingMessage(t('Waiting for wallet approval...'));

      // トランザクション送信 & 検証 & サーバーに保存
      const results = await transferWithIndividualAmounts(
        parsedEntries.map((entry) => ({
          address: entry.address,
          amount: entry.amount,
        })),
        selectedToken === 'SOL' ? undefined : selectedToken,
        now
      );

      // 結果処理中
      updateProcessingMessage(t('Processing results...'));

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
      setTransferLoading(false);
    } catch (error) {
      console.error('Transfer failed:', error);
      setSnackbarMessage(`Transfer failed: ${(error as Error).message}`);
      setSnackbarOpen(true);
      setTransferLoading(false);
    }
  };

  // 選択されたトークンの情報を取得
  const selectedTokenInfo = getTokenInfo(selectedToken);

  // トークンリストがロード中かどうか
  const isLoading = tokenListLoading;

  // textareaでの編集をハンドリングする関数
  const handleTextAreaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setRecipientAddresses(e.target.value);
  };

  // 特定の行のクリックイベントを処理（必要な場合）
  const handleLineClick = (lineNumber: number) => {
    // 行番号をハイライト配列に追加または削除
    if (highlightedLines.includes(lineNumber)) {
      setHighlightedLines(
        highlightedLines.filter((line) => line !== lineNumber)
      );

      // コンソールに行のIDと行番号を表示
      console.log(
        `Line ${lineNumber} unhighlighted (ID: csv-row-${lineNumber})`
      );
    } else {
      setHighlightedLines([...highlightedLines, lineNumber]);

      // コンソールに行のIDと行番号を表示
      console.log(`Line ${lineNumber} highlighted (ID: csv-row-${lineNumber})`);

      // その行の内容をコンソールに表示
      const lines = recipientAddresses.split('\n');
      if (lineNumber <= lines.length) {
        console.log(`Line ${lineNumber} content:`, lines[lineNumber - 1]);
      }

      // エラー行の場合は、エラータイプを表示
      if (validationCSVResult.invalidLineNumbers.includes(lineNumber)) {
        console.log(`Line ${lineNumber} has invalid address format`);
      }
      if (validationCSVResult.duplicateLineNumbers.includes(lineNumber)) {
        console.log(`Line ${lineNumber} contains a duplicate address`);
      }
      if (validationCSVResult.belowMinimumSolLineNumbers.includes(lineNumber)) {
        console.log(
          `Line ${lineNumber} has SOL amount below minimum (${SOL_VALIDATION_AMOUNT})`
        );
      }
    }

    // エラー行をスクロールで表示しやすくする視覚的フィードバック
    const lineElement = document.querySelector(
      `[data-row-id="csv-row-${lineNumber}"]`
    );
    if (lineElement) {
      lineElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  // トランザクションシミュレーションによる手数料計算
  const simulateTransactionFees = useCallback(async () => {
    if (!connection || !publicKey || parsedEntries.length === 0) {
      // エントリがない場合は手数料なし
      setFeeEstimation({
        totalFee: 0,
        accountCreationFees: 0,
        transactionFees: 0,
        operationFees: 0,
        isLoading: false,
        simulatedSuccess: false,
        transactionFeeFallback: false,
        accountCreationFeeFallback: false,
        totalFeeFallback: false,
        progress: { current: 0, total: 0, step: '' },
      });
      setAccountsNeedingCreation([]);
      return;
    }

    console.log(
      '🔍 手数料シミュレーション開始: エントリ数=',
      parsedEntries.length,
      '選択トークン=',
      selectedToken
    );

    // 計算中フラグをON
    setFeeEstimation((prev) => ({
      ...prev,
      isLoading: true,
      // 進捗状態を初期化
      progress: {
        current: 0,
        total:
          selectedToken === 'SOL'
            ? Math.min(parsedEntries.length, 12)
            : Math.min(parsedEntries.length, 12) * 2, // SPLの場合は各エントリに対してアカウント作成＋転送の2操作
        step: '初期化中',
      },
    }));

    try {
      // 手数料シミュレーション結果
      let totalEstimatedFee = 0;
      let accountCreationFee = 0;
      let transactionFee = 0;
      let transactionFeeFallback = false;
      let accountCreationFeeFallback = false;
      let totalFeeFallback = false;
      const accountsToCreate: string[] = [];

      // バッチサイズ（Solanaのトランザクションサイズ制限により決定）
      let simulatedCount = 0; // 実際にシミュレーションを実行した回数
      const maxSimulations = 12; // 最大シミュレーション回数（RPCコール数を抑制）

      const { operationFeePerTx, estimatedTxCount, operationFees } =
        getOperationFee(DEPOSIT_SOL_AMOUNT, parsedEntries, BATCH_SIZE);

      // 運営手数料を合計に加算
      totalEstimatedFee += operationFees;

      // 運営手数料を計算したら状態を更新
      setFeeEstimation((prev) => ({
        ...prev,
        operationFees,
        totalFee: totalEstimatedFee,
        progress: {
          ...prev.progress,
          current: 1,
          step: '運営手数料計算完了',
        },
      }));

      // 少し待機して状態の更新が反映されるようにする
      await new Promise((resolve) => setTimeout(resolve, 100));

      if (selectedToken === 'SOL') {
        // SOL送金シミュレーション - 簡易版
        const maxEntries = Math.min(parsedEntries.length, maxSimulations);

        // 進捗状態を更新
        setFeeEstimation((prev) => ({
          ...prev,
          progress: {
            ...prev.progress,
            step: 'SOL送金シミュレーション開始',
          },
        }));

        try {
          // バッチでエントリを処理
          for (let i = 0; i < maxEntries; i += BATCH_SIZE) {
            const batch = parsedEntries.slice(
              i,
              Math.min(i + BATCH_SIZE, maxEntries)
            );
            console.log(
              `🔄 SOLバッチ処理: ${i}-${i + batch.length - 1}番目の処理開始`
            );

            // 進捗状態を更新
            setFeeEstimation((prev) => ({
              ...prev,
              progress: {
                ...prev.progress,
                current: prev.progress.current + 1,
                step: `SOL送金シミュレーション: ${i + 1}-${i + batch.length}/${maxEntries}`,
              },
            }));

            const transaction = new Transaction();

            // SOL送金命令を追加
            batch.forEach((entry) => {
              const instruction = createInstruction(publicKey, entry);
              transaction.add(instruction);
            });

            // 最新のブロックハッシュを取得
            const { blockhash } =
              await connection.getLatestBlockhash('confirmed');
            transaction.recentBlockhash = blockhash;
            transaction.feePayer = publicKey;

            // シミュレーション実行
            const simulation =
              await connection.simulateTransaction(transaction);

            if (simulation.value.err) {
              console.error(
                '❌ SOLシミュレーションエラー:',
                simulation.value.err
              );
              transactionFeeFallback = true;
            } else {
              simulatedCount++;
              // 計算単位（CU）から手数料を計算
              const unitsConsumed = simulation.value.unitsConsumed || 0;
              console.log(
                '✅ SOLシミュレーション成功 - 消費CU:',
                unitsConsumed
              );

              // Solanaの標準手数料率: 1000 CUあたり0.000005 SOL
              const fee = Math.max((unitsConsumed / 1000) * 0.000005, 0.000005);

              if (!isNaN(fee) && fee > 0) {
                totalEstimatedFee += fee;
                transactionFee += fee;
                console.log(
                  `💰 SOL手数料計算: ${fee.toFixed(8)} SOL (${unitsConsumed} CU使用)`
                );

                // トランザクション手数料を更新
                setFeeEstimation((prev) => ({
                  ...prev,
                  transactionFees: transactionFee,
                  totalFee: totalEstimatedFee,
                  progress: {
                    ...prev.progress,
                    step: `SOL手数料計算: +${fee.toFixed(6)} SOL`,
                  },
                }));
              } else {
                const fallbackFee = 0.000005 * batch.length;
                totalEstimatedFee += fallbackFee;
                transactionFee += fallbackFee;
                transactionFeeFallback = true;
                console.warn(
                  '⚠️ 手数料計算失敗 - フォールバック:',
                  fallbackFee
                );

                // フォールバック手数料を更新
                setFeeEstimation((prev) => ({
                  ...prev,
                  transactionFees: transactionFee,
                  totalFee: totalEstimatedFee,
                  transactionFeeFallback: true,
                  progress: {
                    ...prev.progress,
                    step: `SOL手数料計算(概算): +${fallbackFee.toFixed(6)} SOL`,
                  },
                }));
              }
            }

            // 少し待機して状態の更新が反映されるようにする
            await new Promise((resolve) => setTimeout(resolve, 50));
          }
        } catch (err) {
          console.error('❌ SOLシミュレーション例外:', err);
          transactionFeeFallback = true;

          // フォールバック計算
          const fallbackFee =
            0.000005 * Math.min(parsedEntries.length, maxSimulations);
          totalEstimatedFee += fallbackFee;
          transactionFee += fallbackFee;

          // エラー時の状態更新
          setFeeEstimation((prev) => ({
            ...prev,
            transactionFees: transactionFee,
            totalFee: totalEstimatedFee,
            transactionFeeFallback: true,
            progress: {
              ...prev.progress,
              step: `SOLシミュレーションエラー: フォールバック値使用`,
            },
          }));
        }

        // 残りのエントリの手数料を平均値から推定
        if (parsedEntries.length > maxSimulations) {
          const remainingEntries = parsedEntries.length - maxSimulations;
          let avgFee =
            simulatedCount > 0 ? transactionFee / simulatedCount : 0.000005;
          if (isNaN(avgFee) || avgFee <= 0) avgFee = 0.000005;

          const extrapolatedFee = avgFee * remainingEntries;
          totalEstimatedFee += extrapolatedFee;
          transactionFee += extrapolatedFee;
          totalFeeFallback = true;
          console.log(
            `📊 残り${remainingEntries}エントリの概算手数料: ${extrapolatedFee.toFixed(8)} SOL (平均${avgFee.toFixed(8)} SOL/トランザクション)`
          );

          // 残りエントリの概算を更新
          setFeeEstimation((prev) => ({
            ...prev,
            transactionFees: transactionFee,
            totalFee: totalEstimatedFee,
            totalFeeFallback: true,
            progress: {
              ...prev.progress,
              current: prev.progress.total,
              step: `残り${remainingEntries}エントリの概算完了: +${extrapolatedFee.toFixed(6)} SOL`,
            },
          }));
        }
      } else {
        // SPLトークン送金シミュレーション - 完全リニューアル版
        try {
          // 選択されたトークンの詳細情報を取得
          const tokenMint = new PublicKey(selectedToken);

          // トークンのメタデータを探す（デシマル値の取得のため）
          const selectedTokenDetail = getTokenInfo(selectedToken);
          const tokenDecimals = selectedTokenDetail.decimals;
          console.log(
            `🪙 トークン情報: ${selectedTokenDetail.symbol}, デシマル=${tokenDecimals}`
          );

          // 進捗状態を更新
          setFeeEstimation((prev) => ({
            ...prev,
            progress: {
              ...prev.progress,
              step: 'SPLトークン送金シミュレーション開始',
            },
          }));

          // 送金元のトークンアカウント
          const senderTokenAccount = await getAssociatedTokenAddress(
            tokenMint,
            publicKey
          );

          // 最大シミュレーション件数まで処理
          const maxEntries = Math.min(parsedEntries.length, maxSimulations);

          // 各受信者アドレスに対して処理
          for (let i = 0; i < maxEntries; i++) {
            const entry = parsedEntries[i];
            try {
              console.log(
                `💸 送信先(${i + 1}/${maxEntries}): ${entry.address}, 金額: ${entry.amount}`
              );

              // 進捗状態を更新
              setFeeEstimation((prev) => ({
                ...prev,
                progress: {
                  ...prev.progress,
                  current: prev.progress.current + 1,
                  step: `SPLトークン転送(${i + 1}/${maxEntries}): アドレス確認中`,
                },
              }));

              const receiverPubkey = new PublicKey(entry.address);

              // 受信者のトークンアカウント
              const receiverTokenAccount = await getAssociatedTokenAddress(
                tokenMint,
                receiverPubkey
              );

              // トークンアカウントの存在確認（本番環境でのRPCコール）
              const accountInfo =
                await connection.getAccountInfo(receiverTokenAccount);

              // アカウント作成が必要かどうか
              let needsAccountCreation = false;
              if (!accountInfo) {
                accountsToCreate.push(entry.address);
                needsAccountCreation = true;
                console.log(
                  `🔄 トークンアカウント作成必要: ${entry.address} → ${receiverTokenAccount.toString()}`
                );

                // 進捗状態を更新
                setFeeEstimation((prev) => ({
                  ...prev,
                  progress: {
                    ...prev.progress,
                    step: `トークンアカウント作成必要: ${entry.address.slice(0, 4)}...${entry.address.slice(-4)}`,
                  },
                }));
              }

              // アカウント作成シミュレーション（必要な場合のみ）
              if (needsAccountCreation) {
                const createTx = await createAccountInstruction(
                  publicKey,
                  receiverTokenAccount,
                  receiverPubkey,
                  tokenMint,
                  connection
                );

                try {
                  // アカウント作成シミュレーション実行
                  const createSimulation =
                    await connection.simulateTransaction(createTx);
                  simulatedCount++;

                  if (createSimulation.value.err) {
                    console.error(
                      '❌ アカウント作成シミュレーションエラー:',
                      createSimulation.value.err
                    );
                    accountCreationFeeFallback = true;

                    // フォールバック値を使用
                    const fallbackFee = 0.00203928; // アカウント作成の標準的なコスト
                    accountCreationFee += fallbackFee;
                    totalEstimatedFee += fallbackFee;

                    // フォールバック手数料を更新
                    setFeeEstimation((prev) => ({
                      ...prev,
                      accountCreationFees: accountCreationFee,
                      totalFee: totalEstimatedFee,
                      accountCreationFeeFallback: true,
                      progress: {
                        ...prev.progress,
                        step: `アカウント作成手数料(概算): +${fallbackFee.toFixed(6)} SOL`,
                      },
                    }));
                  } else {
                    // 成功したシミュレーションから手数料を計算
                    const unitsConsumed =
                      createSimulation.value.unitsConsumed || 0;
                    console.log(
                      '✅ アカウント作成シミュレーション成功 - 消費CU:',
                      unitsConsumed
                    );

                    // 計算単位から手数料計算 + レント免除コスト加算
                    const computeFee = Math.max(
                      (unitsConsumed / 1000) * 0.000005,
                      0.000005
                    );
                    const rentExemptCost = 0.00203928; // レント免除コスト（固定）
                    const totalFee = computeFee + rentExemptCost;

                    if (!isNaN(totalFee) && totalFee > 0) {
                      accountCreationFee += totalFee;
                      totalEstimatedFee += totalFee;
                      console.log(
                        `💰 アカウント作成手数料: ${totalFee.toFixed(8)} SOL (CU手数料=${computeFee.toFixed(8)}, レント免除=${rentExemptCost})`
                      );

                      // アカウント作成手数料を更新
                      setFeeEstimation((prev) => ({
                        ...prev,
                        accountCreationFees: accountCreationFee,
                        totalFee: totalEstimatedFee,
                        progress: {
                          ...prev.progress,
                          step: `アカウント作成手数料: +${totalFee.toFixed(6)} SOL`,
                        },
                      }));
                    } else {
                      const fallbackFee = 0.00203928;
                      accountCreationFee += fallbackFee;
                      totalEstimatedFee += fallbackFee;
                      accountCreationFeeFallback = true;
                      console.warn(
                        '⚠️ アカウント作成手数料計算失敗 - フォールバック:',
                        fallbackFee
                      );

                      // フォールバック手数料を更新
                      setFeeEstimation((prev) => ({
                        ...prev,
                        accountCreationFees: accountCreationFee,
                        totalFee: totalEstimatedFee,
                        accountCreationFeeFallback: true,
                        progress: {
                          ...prev.progress,
                          step: `アカウント作成手数料(概算): +${fallbackFee.toFixed(6)} SOL`,
                        },
                      }));
                    }
                  }
                } catch (err) {
                  console.error('❌ アカウント作成シミュレーション例外:', err);
                  accountCreationFeeFallback = true;

                  // 例外時のフォールバック値
                  const fallbackFee = 0.00203928;
                  accountCreationFee += fallbackFee;
                  totalEstimatedFee += fallbackFee;

                  // エラー時の状態更新
                  setFeeEstimation((prev) => ({
                    ...prev,
                    accountCreationFees: accountCreationFee,
                    totalFee: totalEstimatedFee,
                    accountCreationFeeFallback: true,
                    progress: {
                      ...prev.progress,
                      step: `アカウント作成シミュレーションエラー: フォールバック使用`,
                    },
                  }));
                }
              }

              // 進捗状態を更新
              setFeeEstimation((prev) => ({
                ...prev,
                progress: {
                  ...prev.progress,
                  step: `SPLトークン転送シミュレーション中: ${entry.address.slice(0, 4)}...${entry.address.slice(-4)}`,
                },
              }));

              // トークン転送シミュレーション
              const transferTx = new Transaction();

              // 転送命令を追加（デシマルを考慮）
              const rawAmount = Math.floor(
                entry.amount * Math.pow(10, tokenDecimals)
              );
              const transferInstruction = createTransferInstruction(
                senderTokenAccount,
                receiverTokenAccount,
                publicKey,
                rawAmount
              );
              transferTx.add(transferInstruction);

              // シミュレーション用ブロックハッシュ
              const { blockhash } =
                await connection.getLatestBlockhash('confirmed');
              transferTx.recentBlockhash = blockhash;
              transferTx.feePayer = publicKey;

              try {
                // 転送シミュレーション実行
                const transferSimulation =
                  await connection.simulateTransaction(transferTx);
                simulatedCount++;

                if (transferSimulation.value.unitsConsumed === undefined) {
                  console.error(
                    '❌ トークン転送シミュレーションエラー:',
                    transferSimulation.value.err
                  );
                  transactionFeeFallback = true;

                  // フォールバック値を使用
                  const fallbackFee = 0.000005;
                  transactionFee += fallbackFee;
                  totalEstimatedFee += fallbackFee;

                  // フォールバック手数料を更新
                  setFeeEstimation((prev) => ({
                    ...prev,
                    transactionFees: transactionFee,
                    totalFee: totalEstimatedFee,
                    transactionFeeFallback: true,
                    progress: {
                      ...prev.progress,
                      step: `トークン転送手数料(概算): +${fallbackFee.toFixed(6)} SOL`,
                    },
                  }));
                } else {
                  // 成功したシミュレーションから手数料を計算
                  const unitsConsumed =
                    transferSimulation.value.unitsConsumed || 0;
                  console.log(
                    '✅ トークン転送シミュレーション成功 - 消費CU:',
                    unitsConsumed,
                    'Raw Amount:',
                    rawAmount
                  );

                  // 計算単位から手数料計算
                  const fee = Math.max(
                    (unitsConsumed / 1000) * 0.000005,
                    0.000005
                  );

                  if (!isNaN(fee) && fee > 0) {
                    transactionFee += fee;
                    totalEstimatedFee += fee;
                    console.log(
                      `💰 トークン転送手数料: ${fee.toFixed(8)} SOL (${unitsConsumed} CU使用)`
                    );

                    // トランザクション手数料を更新
                    setFeeEstimation((prev) => ({
                      ...prev,
                      transactionFees: transactionFee,
                      totalFee: totalEstimatedFee,
                      progress: {
                        ...prev.progress,
                        step: `トークン転送手数料: +${fee.toFixed(6)} SOL`,
                      },
                    }));
                  } else {
                    const fallbackFee = 0.000005;
                    transactionFee += fallbackFee;
                    totalEstimatedFee += fallbackFee;
                    transactionFeeFallback = true;
                    console.warn(
                      '⚠️ トークン転送手数料計算失敗 - フォールバック:',
                      fallbackFee
                    );

                    // フォールバック手数料を更新
                    setFeeEstimation((prev) => ({
                      ...prev,
                      transactionFees: transactionFee,
                      totalFee: totalEstimatedFee,
                      transactionFeeFallback: true,
                      progress: {
                        ...prev.progress,
                        step: `トークン転送手数料(概算): +${fallbackFee.toFixed(6)} SOL`,
                      },
                    }));
                  }
                }
              } catch (err) {
                console.error('❌ トークン転送シミュレーション例外:', err);
                transactionFeeFallback = true;

                // 例外時のフォールバック値
                const fallbackFee = 0.000005;
                transactionFee += fallbackFee;
                totalEstimatedFee += fallbackFee;

                // エラー時の状態更新
                setFeeEstimation((prev) => ({
                  ...prev,
                  transactionFees: transactionFee,
                  totalFee: totalEstimatedFee,
                  transactionFeeFallback: true,
                  progress: {
                    ...prev.progress,
                    step: `トークン転送シミュレーションエラー: フォールバック使用`,
                  },
                }));
              }

              // 少し待機して状態の更新が反映されるようにする
              await new Promise((resolve) => setTimeout(resolve, 50));
            } catch (err) {
              console.error(`❌ エントリ処理エラー (${entry.address}):`, err);
              // 各種フォールバック値を適用
              transactionFeeFallback = true;
              const transferFallbackFee = 0.000005;
              transactionFee += transferFallbackFee;
              totalEstimatedFee += transferFallbackFee;

              // エラー時の状態更新
              setFeeEstimation((prev) => ({
                ...prev,
                transactionFees: transactionFee,
                totalFee: totalEstimatedFee,
                transactionFeeFallback: true,
                progress: {
                  ...prev.progress,
                  step: `エントリ処理エラー: フォールバック使用`,
                },
              }));
            }
          }

          // 残りのエントリの手数料を平均値から推定
          if (parsedEntries.length > maxSimulations) {
            const remainingEntries = parsedEntries.length - maxSimulations;

            // 転送手数料平均計算
            let avgTransferFee = 0;
            if (simulatedCount > 0 && transactionFee > 0) {
              avgTransferFee = transactionFee / maxSimulations;
            } else {
              avgTransferFee = 0.000005; // フォールバック平均値
              transactionFeeFallback = true;
            }

            // トークンアカウント作成比率の計算
            const creationRatio = accountsToCreate.length / maxSimulations;
            const estimatedNewAccounts = Math.floor(
              remainingEntries * creationRatio
            );

            // アカウント作成平均手数料計算
            let avgCreationFee = 0;
            if (accountsToCreate.length > 0) {
              avgCreationFee = accountCreationFee / accountsToCreate.length;
              if (isNaN(avgCreationFee) || avgCreationFee <= 0) {
                avgCreationFee = 0.00203928; // フォールバック平均値
                accountCreationFeeFallback = true;
              }
            }

            // 追加推定手数料を計算
            const extraTransferFee = avgTransferFee * remainingEntries;
            const extraCreationFee = avgCreationFee * estimatedNewAccounts;
            const extraTotalFee = extraTransferFee + extraCreationFee;

            // 推定値を追加
            transactionFee += extraTransferFee;
            accountCreationFee += extraCreationFee;
            totalEstimatedFee += extraTotalFee;
            totalFeeFallback = true;

            console.log(`📊 残り${remainingEntries}エントリの概算:
            - 転送手数料: ${extraTransferFee.toFixed(8)} SOL (平均${avgTransferFee.toFixed(8)} SOL/トランザクション)
            - 推定新アカウント: ${estimatedNewAccounts}個 (比率=${creationRatio.toFixed(2)})
            - アカウント作成手数料: ${extraCreationFee.toFixed(8)} SOL (平均${avgCreationFee.toFixed(8)} SOL/アカウント)
            - 合計追加手数料: ${extraTotalFee.toFixed(8)} SOL`);

            // 概算で必要なアカウント数を追加
            const conceptualAccounts =
              Array(estimatedNewAccounts).fill('estimated');
            setAccountsNeedingCreation([
              ...accountsToCreate,
              ...conceptualAccounts,
            ]);
          } else {
            setAccountsNeedingCreation(accountsToCreate);
          }
        } catch (err) {
          console.error('❌ SPLトークン手数料計算全体エラー:', err);

          // 全体エラー時のフォールバック値
          const transferFallbackFee = 0.000005 * parsedEntries.length;
          const creationFallbackFee =
            0.00203928 * Math.ceil(parsedEntries.length * 0.1); // 10%のアカウントが必要と仮定

          transactionFee = transferFallbackFee;
          accountCreationFee = creationFallbackFee;
          totalEstimatedFee = transferFallbackFee + creationFallbackFee;

          transactionFeeFallback = true;
          accountCreationFeeFallback = true;
          totalFeeFallback = true;

          // 全概算のアカウント数を設定
          const estimatedAccounts = Array(
            Math.ceil(parsedEntries.length * 0.1)
          ).fill('estimated');
          setAccountsNeedingCreation(estimatedAccounts);
        }
      }

      // 最終的なNaNチェック
      if (isNaN(totalEstimatedFee) || totalEstimatedFee <= 0) {
        console.error('❌ 合計手数料が無効:', totalEstimatedFee);
        totalEstimatedFee = parsedEntries.length * 0.000005;
        totalFeeFallback = true;
      }

      if (isNaN(transactionFee) || transactionFee < 0) {
        console.error('❌ トランザクション手数料が無効:', transactionFee);
        transactionFee = parsedEntries.length * 0.000005;
        transactionFeeFallback = true;
      }

      if (isNaN(accountCreationFee) || accountCreationFee < 0) {
        console.error('❌ アカウント作成手数料が無効:', accountCreationFee);
        accountCreationFee = 0;
        accountCreationFeeFallback = selectedToken !== 'SOL';
      }

      // 最終ログ出力
      console.log(`🏁 手数料計算完了:
      - 転送手数料: ${transactionFee.toFixed(8)} SOL ${transactionFeeFallback ? '(概算)' : '(実測)'}
      - アカウント作成手数料: ${accountCreationFee.toFixed(8)} SOL ${accountCreationFeeFallback ? '(概算)' : '(実測)'}
      - 運営手数料: ${operationFees.toFixed(8)} SOL (${operationFeePerTx} SOL × ${estimatedTxCount}トランザクション)
      - 合計: ${totalEstimatedFee.toFixed(8)} SOL ${totalFeeFallback ? '(概算含む)' : '(実測)'}
      - アカウント作成必要数: ${accountsNeedingCreation.length}個`);

      // 手数料情報を更新
      setFeeEstimation({
        totalFee: totalEstimatedFee,
        accountCreationFees: accountCreationFee,
        transactionFees: transactionFee,
        operationFees: operationFees,
        isLoading: false,
        simulatedSuccess: simulatedCount > 0,
        transactionFeeFallback,
        accountCreationFeeFallback,
        totalFeeFallback,
        progress: {
          ...feeEstimation.progress,
          current: simulatedCount,
          total:
            selectedToken === 'SOL'
              ? Math.min(parsedEntries.length, 12)
              : Math.min(parsedEntries.length, 12) * 2,
          step: `手数料計算完了: ${simulatedCount}/${selectedToken === 'SOL' ? Math.min(parsedEntries.length, 12) : Math.min(parsedEntries.length, 12) * 2}`,
        },
      });
    } catch (error) {
      console.error('❌ 手数料シミュレーション全体エラー:', error);

      // 全体エラー時のフォールバック
      const estimatedTransactionFee = parsedEntries.length * 0.000005;
      const estimatedCreationFee =
        selectedToken !== 'SOL'
          ? Math.ceil(parsedEntries.length * 0.1) * 0.00203928
          : 0;
      // 運営手数料の計算（エラー時も同じ計算）
      const estimatedTxCount = Math.ceil(parsedEntries.length / BATCH_SIZE);
      const estimatedOperationFees =
        (parseFloat(DEPOSIT_SOL_AMOUNT) || 0) * estimatedTxCount;
      const totalFee =
        estimatedTransactionFee + estimatedCreationFee + estimatedOperationFees;

      setFeeEstimation({
        totalFee: totalFee,
        accountCreationFees: estimatedCreationFee,
        transactionFees: estimatedTransactionFee,
        operationFees: estimatedOperationFees,
        isLoading: false,
        simulatedSuccess: false,
        transactionFeeFallback: true,
        accountCreationFeeFallback: true,
        totalFeeFallback: true,
        progress: {
          ...feeEstimation.progress,
          current: 0,
          total: 0,
          step: 'エラー発生',
        },
      });

      // エラー時のアカウント概算
      if (selectedToken !== 'SOL') {
        const estimatedAccounts = Array(
          Math.ceil(parsedEntries.length * 0.1)
        ).fill('estimated');
        setAccountsNeedingCreation(estimatedAccounts);
      } else {
        setAccountsNeedingCreation([]);
      }
    }
  }, [connection, publicKey, parsedEntries, selectedToken, tokensWithMetadata]);

  // 入力内容や選択トークンが変更されたら手数料シミュレーションを実行
  useEffect(() => {
    if (connection && publicKey && parsedEntries.length > 0) {
      // 計算処理を少し遅延させて連続入力時の過負荷を防止
      const timer = setTimeout(() => {
        simulateTransactionFees();
      }, 800);

      return () => clearTimeout(timer);
    }
  }, [
    parsedEntries,
    selectedToken,
    connection,
    publicKey,
    simulateTransactionFees,
  ]);

  return (
    <Box
      sx={{
        height: 'calc(100vh - 8vh - 8vh)', // ヘッダー(8vh)とフッター(8vh)引く
        backgroundImage: `url("/bg.webp")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      <Container maxWidth="md">
        {/* SOL Balance & Address */}
        <Card sx={{ my: 4 }}>
          <CardContent>
            <Typography variant="h6" mb={2} textAlign="center" fontWeight={600}>
              {t('SOL Balance')}
            </Typography>
            {!connected ? (
              <Typography
                variant="h4"
                fontWeight="bold"
                color={COLORS.PURPLE.LIGHT}
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
                color={COLORS.PURPLE.LIGHT}
                textAlign="center"
              >
                {balance?.toFixed(8) ?? '0.00000000'} SOL
              </Typography>
            )}

            <Divider
              variant="fullWidth"
              sx={{
                my: 2,
                borderColor: '#7867EA',
                borderWidth: 1,
                width: 'calc(95% + 15px)',
                position: 'relative',
                left: '50%',
                transform: 'translateX(-50%)',
              }}
            />

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
              <Typography variant="h6" textAlign="center" fontWeight={600}>
                {t('SPL Tokens')}
              </Typography>
              <Box textAlign="center" p={2} color={COLORS.PURPLE.LIGHT}>
                {t('Connect your wallet to view your tokens')}
              </Box>
            </CardContent>
          </Card>
        )}

        {/* Transfer Form */}
        <Card sx={{ mb: 4 }}>
          <CardContent>
            <Typography variant="h6" textAlign="center" mb={2} fontWeight={600}>
              {t('Token Transfer')}
            </Typography>

            {/* Token Selection - 改善版 */}
            <FormControl
              fullWidth
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  p: 0,
                  '& fieldset': {
                    borderColor: COLORS.PURPLE.LIGHT,
                  },
                  '&:hover fieldset': {
                    borderColor: 'rgb(220, 215, 254)',
                  },
                  '&.Mui-focused fieldset': {
                    borderColor: 'rgb(179, 172, 227)',
                  },
                  '& .MuiSelect-icon': {
                    color: COLORS.PURPLE.LIGHT, // 矢印アイコンを白色に変更
                  },
                },
              }}
            >
              <InputLabel
                sx={{
                  color: COLORS.PURPLE.LIGHT,
                  '&.Mui-focused': {
                    color: COLORS.PURPLE.LIGHT,
                  },
                }}
              >
                {t('Select Token')}
              </InputLabel>
              <Select
                value={selectedToken}
                label={t('Select Token')}
                onChange={(e) => setSelectedToken(e.target.value)}
                renderValue={() => (
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Avatar
                      src={
                        selectedTokenInfo.symbol === 'SOL'
                          ? '/solana-logo.png'
                          : selectedTokenInfo.icon
                      }
                      alt={selectedTokenInfo.symbol}
                      sx={{
                        ...(selectedTokenInfo.symbol === 'SOL'
                          ? {
                              width: '32px',
                              height: '32px',
                              marginRight: '8px',
                              bgcolor: COLORS.GRAY.DARK,
                              '& img': {
                                width: '19.5px',
                                height: '19.5px',
                                margin: '0',
                                objectFit: 'contain',
                              },
                            }
                          : {
                              width: '32px',
                              height: '32px',
                              marginRight: '8px',
                            }),
                      }}
                    />
                    <Typography color={COLORS.GRAY.LIGHT} fontSize={16}>
                      {selectedTokenInfo.symbol} - {selectedTokenInfo.name}
                    </Typography>
                  </Box>
                )}
              >
                <MenuItem value="SOL">
                  <ListItemAvatar>
                    <Avatar
                      src="/solana-logo.png"
                      alt="SOL"
                      sx={{
                        width: '32px',
                        height: '32px',
                        marginRight: '0',
                        bgcolor: COLORS.GRAY.DARK,
                        '& img': {
                          width: '19.5px',
                          height: '19.5px',
                          margin: '0',
                          objectFit: 'contain',
                        },
                      }}
                    />
                  </ListItemAvatar>
                  <ListItemText
                    primary="SOL - Solana"
                    secondary="Native Token"
                    sx={{
                      '& .MuiListItemText-secondary': {
                        color: COLORS.PURPLE.LIGHT,
                      },
                    }}
                  />
                </MenuItem>

                {/* トークンのロード状態表示 */}
                {tokensWithMetadata.length === 0 && isLoading ? (
                  <MenuItem disabled>
                    <Box display="flex" alignItems="center" py={1}>
                      <CircularProgress size={20} sx={{ mr: 2 }} />
                      <Typography>トークンを読み込み中...</Typography>
                    </Box>
                  </MenuItem>
                ) : tokensWithMetadata.length === 0 && !isLoading ? (
                  <MenuItem disabled>
                    <Typography color="text.secondary">
                      SPLトークンが見つかりません
                    </Typography>
                  </MenuItem>
                ) : (
                  // ロード済みの各トークンを表示
                  tokensWithMetadata.map((token) => (
                    <MenuItem
                      key={token.account.mint}
                      value={token.account.mint}
                    >
                      <ListItemAvatar>
                        <Avatar
                          src={token.metadata?.uri || '/token-placeholder.png'}
                          alt={token.metadata?.symbol || 'Token'}
                          sx={{
                            width: 32,
                            height: 32,
                            ...(token.metadata?.uri ===
                              '/token-placeholder.png' && {
                              margin: '0',
                              objectFit: 'contain',
                            }),
                          }}
                        />
                      </ListItemAvatar>
                      <ListItemText
                        primary={`${token.metadata?.symbol || 'Unknown'} - ${token.metadata?.name || 'Unknown Token'}`}
                        secondary={`${token.account.mint.slice(0, 6)}...${token.account.mint.slice(-6)}`}
                        sx={{
                          '& .MuiListItemText-secondary': {
                            color: COLORS.PURPLE.LIGHT,
                          },
                        }}
                      />
                    </MenuItem>
                  ))
                )}

                {/* トークンがある場合でもまだロード中の表示 */}
                {tokensWithMetadata.length > 0 && isLoading && (
                  <MenuItem disabled>
                    <Box display="flex" alignItems="center" py={1}>
                      <CircularProgress size={20} sx={{ mr: 2 }} />
                      <Typography>さらにトークンを読み込み中...</Typography>
                    </Box>
                  </MenuItem>
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
                        {isLoading ? 'Refreshing...' : 'Refresh token list'}
                      </Typography>
                      {isLoading && (
                        <CircularProgress size={16} sx={{ ml: 1 }} />
                      )}
                    </Box>
                  </MenuItem>
                )}
              </Select>
            </FormControl>

            {/* Recipient Addresses with Amounts */}
            <Box mb={3}>
              <Typography
                variant="body2"
                fontWeight={600}
                mb={1}
                color={COLORS.PURPLE.LIGHT}
              >
                {t('Recipient Addresses and Amounts')}
                <br />
                {t(
                  'Solana transfers support a maximum of 8 decimal places, exceeding which will result in failure.'
                )}
              </Typography>

              <Typography
                variant="caption"
                color={COLORS.PURPLE.LIGHT}
                mt={2}
                mb={1}
                display="block"
                fontSize={16}
                fontWeight={500}
              >
                {t('Format: address,amount (one entry per line)')}
              </Typography>

              <Box position="relative">
                {/* 行番号付きテキストフィールド */}
                <Box
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    border: '1px solid',
                    borderColor: (theme) =>
                      invalidEntries.length > 0 ||
                      duplicateAddresses.length > 0 ||
                      (selectedToken === 'SOL' && belowMinSolEntries.length > 0)
                        ? theme.palette.error.main
                        : 'rgba(0, 0, 0, 0.23)',
                    borderRadius: 1,
                    '&:hover': {
                      borderColor: 'rgba(0, 0, 0, 0.87)',
                    },
                    '&:focus-within': {
                      borderColor: (theme) => theme.palette.primary.main,
                      borderWidth: '2px',
                    },
                  }}
                >
                  {/* スクロール同期のためのコンテナ */}
                  <Box
                    sx={{
                      display: 'flex',
                      maxHeight: '300px', // 約10行分の高さに制限
                      overflow: 'auto', // スクロール可能に
                      '&::-webkit-scrollbar': {
                        width: '8px',
                        height: '8px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#c1c1c1',
                        borderRadius: '4px',
                      },
                      '&::-webkit-scrollbar-thumb:hover': {
                        background: '#a8a8a8',
                      },
                    }}
                  >
                    {/* 行番号表示 */}
                    <Box
                      sx={{
                        width: '40px',
                        minWidth: '40px',
                        bgcolor: (theme) => theme.palette.grey[100],
                        color: (theme) => theme.palette.grey[600],
                        borderRight: '1px solid rgba(0, 0, 0, 0.1)',
                        py: 1,
                        textAlign: 'right',
                        userSelect: 'none',
                        fontFamily: 'monospace',
                        fontSize: '0.8rem',
                        height: '100%',
                        paddingTop: '5px',
                        paddingBottom: '5px',
                      }}
                    >
                      {/* 行番号を生成 - 実際の行数に合わせて動的に表示 */}
                      {recipientAddresses.split('\n').map((_, i) => (
                        <Box
                          key={i}
                          data-row-id={`line-number-${i + 1}`}
                          data-line-number={i + 1}
                          sx={{
                            pr: 1,
                            height: '20px',
                            color: highlightedLines.includes(i + 1)
                              ? 'red'
                              : 'inherit', // ハイライト行の番号も赤くする
                            cursor: 'pointer', // クリック可能であることを示す
                            backgroundColor: highlightedLines.includes(i + 1)
                              ? 'rgba(255, 0, 0, 0.05)'
                              : 'transparent', // ハイライト行の背景もわずかに色付け
                            transition: 'background-color 0.2s ease',
                            '&:hover': {
                              backgroundColor: highlightedLines.includes(i + 1)
                                ? 'rgba(255, 0, 0, 0.1)'
                                : 'rgba(0, 0, 0, 0.05)', // ホバー時の背景色
                            },
                          }}
                          onClick={() => handleLineClick(i + 1)}
                        >
                          {i + 1}
                        </Box>
                      ))}
                      {/* 最小10行の行番号を表示 */}
                      {recipientAddresses.split('\n').length < 10 &&
                        Array.from(
                          {
                            length: 10 - recipientAddresses.split('\n').length,
                          },
                          (_, i) => (
                            <Box
                              key={i + recipientAddresses.split('\n').length}
                              data-row-id={`line-number-${i + recipientAddresses.split('\n').length + 1}`}
                              data-line-number={
                                i + recipientAddresses.split('\n').length + 1
                              }
                              sx={{
                                pr: 1,
                                height: '20px',
                                cursor: 'pointer',
                                backgroundColor: highlightedLines.includes(
                                  i + recipientAddresses.split('\n').length + 1
                                )
                                  ? 'rgba(255, 0, 0, 0.05)'
                                  : 'transparent',
                                transition: 'background-color 0.2s ease',
                                '&:hover': {
                                  backgroundColor: highlightedLines.includes(
                                    i +
                                      recipientAddresses.split('\n').length +
                                      1
                                  )
                                    ? 'rgba(255, 0, 0, 0.1)'
                                    : 'rgba(0, 0, 0, 0.05)',
                                },
                              }}
                              onClick={() =>
                                handleLineClick(
                                  i + recipientAddresses.split('\n').length + 1
                                )
                              }
                            >
                              {i + recipientAddresses.split('\n').length + 1}
                            </Box>
                          )
                        )}
                    </Box>

                    {/* テキストエリア - 隠しtextareaと表示用の行コンテナに分ける */}
                    <Box
                      sx={{
                        flexGrow: 1,
                        py: 1,
                        fontFamily: 'monospace',
                        fontSize: '0.875rem',
                        height: '100%',
                        paddingTop: '5px',
                        paddingBottom: '0px',
                        position: 'relative',
                      }}
                    >
                      {/* 実際に編集するためのtextarea（透明） */}
                      <textarea
                        value={recipientAddresses}
                        onChange={handleTextAreaChange}
                        placeholder="BZsKiYDM3V71cJGnCTQV6As8G2hh6QiKEx65px8oATwz,1.822817"
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: 'calc(100% - 16px)',
                          height: 'calc(100% - 16px);',
                          border: 'none',
                          outline: 'none',
                          resize: 'none',
                          background: 'transparent',
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          lineHeight: '20px',
                          padding: '8px',
                          paddingTop: '5px',
                          color: 'transparent',
                          caretColor: 'black', // カーソルだけ見えるように
                          zIndex: 2,
                        }}
                        rows={
                          recipientAddresses.split('\n').length > 10
                            ? recipientAddresses.split('\n').length
                            : 10
                        }
                      />

                      {/* 色付き表示用のテキスト */}
                      <Box
                        sx={{
                          fontFamily: 'monospace',
                          fontSize: '0.875rem',
                          lineHeight: '20px',
                          padding: '8px',
                          whiteSpace: 'pre-wrap',
                          pointerEvents: 'none', // クリックをtextareaに通過させる
                          paddingTop: '0px',
                        }}
                      >
                        {recipientAddresses.split('\n').map((line, i) => (
                          <Box
                            key={i}
                            data-row-id={`csv-row-${i + 1}`}
                            data-line-number={i + 1}
                            sx={{
                              height: '20px',
                              color: highlightedLines.includes(i + 1)
                                ? 'red'
                                : 'inherit', // 指定行を赤色に
                              position: 'relative',
                              '&::before': {
                                content: '""',
                                position: 'absolute',
                                left: '-8px',
                                top: '0',
                                width: '4px',
                                height: '100%',
                                backgroundColor: highlightedLines.includes(
                                  i + 1
                                )
                                  ? 'red'
                                  : 'transparent',
                                transition: 'background-color 0.2s ease',
                              },
                            }}
                            onClick={() => handleLineClick(i + 1)} // コンポーネントをクリック可能に
                          >
                            {line || ' '} {/* 空行の場合でも高さを確保 */}
                          </Box>
                        ))}
                        {/* 最小10行の高さを確保 */}
                        {recipientAddresses.split('\n').length < 10 &&
                          Array.from(
                            {
                              length:
                                10 - recipientAddresses.split('\n').length,
                            },
                            (_, i) => (
                              <Box
                                key={i + recipientAddresses.split('\n').length}
                                data-row-id={`csv-row-${i + recipientAddresses.split('\n').length + 1}`}
                                data-line-number={
                                  i + recipientAddresses.split('\n').length + 1
                                }
                                sx={{
                                  height: '20px',
                                  position: 'relative',
                                  '&::before': {
                                    content: '""',
                                    position: 'absolute',
                                    left: '-8px',
                                    top: '0',
                                    width: '4px',
                                    height: '100%',
                                    backgroundColor: 'transparent',
                                    transition: 'background-color 0.2s ease',
                                  },
                                }}
                                onClick={() =>
                                  handleLineClick(
                                    i +
                                      recipientAddresses.split('\n').length +
                                      1
                                  )
                                }
                              >
                                &nbsp;
                              </Box>
                            )
                          )}
                      </Box>
                    </Box>
                  </Box>

                  {/* エラーメッセージ表示 */}
                  {(invalidEntries.length > 0 ||
                    duplicateAddresses.length > 0 ||
                    (selectedToken === 'SOL' &&
                      belowMinSolEntries.length > 0)) && (
                    <Box
                      component="table"
                      sx={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.75rem',
                        mt: 0.5,
                        color: COLORS.PURPLE.LIGHT,
                      }}
                    >
                      {invalidEntries.length > 0
                        ? `Invalid entries: ${invalidEntries.length}`
                        : duplicateAddresses.length > 0
                          ? `Duplicate addresses: ${duplicateAddresses.length}`
                          : selectedToken === 'SOL' &&
                              belowMinSolEntries.length > 0
                            ? `${belowMinSolEntries.length} entries below minimum SOL amount (${SOL_VALIDATION_AMOUNT})`
                            : ''}
                    </Box>
                  )}
                </Box>

                {/* ペーストボタン - 元の見た目に戻しつつ機能を修正 */}
                <Tooltip
                  title={isPasted ? 'Pasted !' : 'Paste'}
                  arrow
                  placement="top"
                >
                  <Box
                    style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      zIndex: 2,
                    }}
                  >
                    <IconButton onClick={pasteAddresses}>
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
                  </Box>
                </Tooltip>
              </Box>
              <Box
                position="relative"
                display="flex"
                justifyContent="space-between"
                alignItems="center"
                mt={0.5}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color={COLORS.PURPLE.LIGHT}
                    fontWeight={600}
                  >
                    {t('Valid entries')}: {parsedEntries.length}
                  </Typography>
                  {(invalidEntries.length > 0 ||
                    duplicateAddresses.length > 0 ||
                    belowMinSolEntries.length > 0) && (
                    <Box
                      component="table"
                      sx={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        fontSize: '0.75rem',
                        mt: 0.5,
                      }}
                    >
                      <tbody>
                        {validationCSVResult.invalidLineNumbers.length > 0 && (
                          <tr>
                            <Box
                              component="td"
                              sx={{
                                color: 'error.main',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                pr: 1,
                                verticalAlign: 'top',
                                width: '1%',
                              }}
                            >
                              {t('Invalid lines')}:
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                verticalAlign: 'top',
                                color: 'transparent', // 行の色を透明に
                                textShadow: '0 0 0 rgba(211, 47, 47, 0.7)', // テキストのアウトラインだけを表示
                              }}
                            >
                              {validationCSVResult.invalidLineNumbers.map(
                                (lineNum) => (
                                  <Box
                                    component="span"
                                    key={`invalid-summary-${lineNum}`}
                                    sx={{
                                      cursor: 'pointer',
                                      display: 'inline-block',
                                      mx: 0.5,
                                      '&:hover': {
                                        textDecoration: 'underline',
                                      },
                                    }}
                                    onClick={() => handleLineClick(lineNum)}
                                  >
                                    {lineNum}
                                  </Box>
                                )
                              )}
                            </Box>
                          </tr>
                        )}
                        {validationCSVResult.invalidAddressNumbers.length >
                          0 && (
                          <tr>
                            <Box
                              component="td"
                              sx={{
                                color: 'error.main',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                pr: 1,
                                verticalAlign: 'top',
                                width: '1%',
                              }}
                            >
                              | {t('Invalid addresses')}:
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                verticalAlign: 'top',
                                color: 'transparent',
                                textShadow: '0 0 0 rgba(211, 47, 47, 0.7)',
                              }}
                            >
                              {validationCSVResult.invalidAddressNumbers.map(
                                (lineNum) => (
                                  <Box
                                    component="span"
                                    key={`duplicate-summary-${lineNum}`}
                                    sx={{
                                      cursor: 'pointer',
                                      display: 'inline-block',
                                      mx: 0.5,
                                      '&:hover': {
                                        textDecoration: 'underline',
                                      },
                                    }}
                                    onClick={() => handleLineClick(lineNum)}
                                  >
                                    {lineNum}
                                  </Box>
                                )
                              )}
                            </Box>
                          </tr>
                        )}
                        {validationCSVResult.duplicateLineNumbers.length >
                          0 && (
                          <tr>
                            <Box
                              component="td"
                              sx={{
                                color: 'error.main',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                pr: 1,
                                verticalAlign: 'top',
                                width: '1%',
                              }}
                            >
                              | {t('Duplicate addresses')}:
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                verticalAlign: 'top',
                                color: 'transparent',
                                textShadow: '0 0 0 rgba(211, 47, 47, 0.7)',
                              }}
                            >
                              {validationCSVResult.duplicateLineNumbers.map(
                                (lineNum) => (
                                  <Box
                                    component="span"
                                    key={`duplicate-summary-${lineNum}`}
                                    sx={{
                                      cursor: 'pointer',
                                      display: 'inline-block',
                                      mx: 0.5,
                                      '&:hover': {
                                        textDecoration: 'underline',
                                      },
                                    }}
                                    onClick={() => handleLineClick(lineNum)}
                                  >
                                    {lineNum}
                                  </Box>
                                )
                              )}
                            </Box>
                          </tr>
                        )}
                        {validationCSVResult.invalidSolNumbers.length > 0 && (
                          <tr>
                            <Box
                              component="td"
                              sx={{
                                color: 'error.main',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                pr: 1,
                                verticalAlign: 'top',
                                width: '1%',
                              }}
                            >
                              | {t('Invalid amounts')}:
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                verticalAlign: 'top',
                                color: 'transparent',
                                textShadow: '0 0 0 rgba(211, 47, 47, 0.7)',
                              }}
                            >
                              {validationCSVResult.invalidSolNumbers.map(
                                (lineNum) => (
                                  <Box
                                    component="span"
                                    key={`duplicate-summary-${lineNum}`}
                                    sx={{
                                      cursor: 'pointer',
                                      display: 'inline-block',
                                      mx: 0.5,
                                      '&:hover': {
                                        textDecoration: 'underline',
                                      },
                                    }}
                                    onClick={() => handleLineClick(lineNum)}
                                  >
                                    {lineNum}
                                  </Box>
                                )
                              )}
                            </Box>
                          </tr>
                        )}
                        {validationCSVResult.belowMinimumSolLineNumbers.length >
                          0 && (
                          <tr>
                            <Box
                              component="td"
                              sx={{
                                color: 'error.main',
                                fontWeight: 'bold',
                                whiteSpace: 'nowrap',
                                pr: 1,
                                verticalAlign: 'top',
                                width: '1%',
                              }}
                            >
                              | {t('Below')} {SOL_VALIDATION_AMOUNT} SOL:
                            </Box>
                            <Box
                              component="td"
                              sx={{
                                verticalAlign: 'top',
                                color: 'transparent',
                                textShadow: '0 0 0 rgba(211, 47, 47, 0.7)',
                              }}
                            >
                              {validationCSVResult.belowMinimumSolLineNumbers.map(
                                (lineNum) => (
                                  <Box
                                    component="span"
                                    key={`below-sol-summary-${lineNum}`}
                                    sx={{
                                      cursor: 'pointer',
                                      display: 'inline-block',
                                      mx: 0.5,
                                      '&:hover': {
                                        textDecoration: 'underline',
                                      },
                                    }}
                                    onClick={() => handleLineClick(lineNum)}
                                  >
                                    {lineNum}
                                  </Box>
                                )
                              )}
                            </Box>
                          </tr>
                        )}
                      </tbody>
                    </Box>
                  )}
                </Box>
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
              <Box display="flex" alignItems="center" gap={1}>
                <img
                  src="/icons/transaction-result.svg"
                  alt="Transaction Result"
                  width={20}
                />
                <Typography variant="body2" fontWeight={600} my={1.5}>
                  {t('Transaction Simulation')}
                </Typography>
              </Box>
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
                    title: t('Total Addresses'),
                    value: parsedEntries.length,
                  },
                  {
                    title: t('Total Token Sent'),
                    value: totalAmount.toFixed(3),
                    subText:
                      accountsNeedingCreation.length > 0
                        ? `${accountsNeedingCreation.length} ${t('accounts need creation')}`
                        : ``,
                  },
                  {
                    title: t('Total Transactions'),
                    value: Math.ceil(parsedEntries.length / BATCH_SIZE),
                    subText: `≒ ${parsedEntries.length} / ${BATCH_SIZE}`,
                  },
                  {
                    title: t('SOL Balance'),
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

              {/* 手数料情報表示 */}
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  borderRadius: 2,
                  bgcolor: 'rgba(25, 118, 210, 0.05)',
                  border: '1px solid rgba(25, 118, 210, 0.2)',
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight="bold"
                  mb={1}
                  display="flex"
                  alignItems="center"
                >
                  {t('Simulated Network Fees')}
                  {feeEstimation.isLoading && (
                    <CircularProgress size={16} sx={{ ml: 1 }} />
                  )}
                  {!feeEstimation.isLoading &&
                    feeEstimation.simulatedSuccess &&
                    !feeEstimation.totalFeeFallback && (
                      <Box
                        component="span"
                        sx={{
                          ml: 1,
                          color: 'success.main',
                          fontSize: '0.75rem',
                        }}
                      >
                        {t('Results from the actual simulation')}
                      </Box>
                    )}
                  {!feeEstimation.isLoading &&
                    (!feeEstimation.simulatedSuccess ||
                      feeEstimation.totalFeeFallback) &&
                    parsedEntries.length > 0 && (
                      <Box
                        component="span"
                        sx={{
                          ml: 1,
                          color: 'warning.main',
                          fontSize: '0.75rem',
                        }}
                      >
                        ({t('Estimated results')})
                      </Box>
                    )}
                </Typography>

                <Box display="flex" flexDirection="column" gap={0.5}>
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">
                      {t('Transaction Fees')}:
                    </Typography>
                    <Box display="flex" alignItems="center" position="relative">
                      <Typography variant="body2" fontWeight="medium">
                        {feeEstimation.transactionFees.toFixed(6)} SOL
                      </Typography>
                      {feeEstimation.transactionFeeFallback &&
                        parsedEntries.length > 0 && (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.5,
                              color: 'warning.main',
                              fontSize: '0.7rem',
                            }}
                          >
                            ({t('Estimated results')})
                          </Box>
                        )}
                      {feeEstimation.isLoading && (
                        <CircularProgress
                          size={14}
                          sx={{ position: 'absolute', right: -20 }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* 運営手数料を表示 */}
                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body2">
                      {t('Operation Fees')}:
                    </Typography>
                    <Box display="flex" alignItems="center" position="relative">
                      <Typography variant="body2" fontWeight="medium">
                        {feeEstimation.operationFees.toFixed(6)} SOL
                      </Typography>
                      <Box
                        component="span"
                        sx={{ ml: 0.5, fontSize: '0.7rem' }}
                      >
                        ({parseFloat(DEPOSIT_SOL_AMOUNT).toFixed(6)} SOL ×{' '}
                        {Math.ceil(parsedEntries.length / BATCH_SIZE)})
                      </Box>
                      {feeEstimation.isLoading && (
                        <CircularProgress
                          size={14}
                          sx={{ position: 'absolute', right: -20 }}
                        />
                      )}
                    </Box>
                  </Box>
                  {selectedToken !== 'SOL' && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2">
                        {t('Token Account Creation Fees')}:
                      </Typography>
                      <Box
                        display="flex"
                        alignItems="center"
                        position="relative"
                      >
                        <Typography variant="body2" fontWeight="medium">
                          {feeEstimation.accountCreationFees.toFixed(6)} SOL
                        </Typography>
                        {feeEstimation.accountCreationFeeFallback && (
                          <Box
                            component="span"
                            sx={{
                              ml: 0.5,
                              color: 'warning.main',
                              fontSize: '0.7rem',
                            }}
                          >
                            ({t('Estimated results')})
                          </Box>
                        )}
                        {feeEstimation.isLoading && (
                          <CircularProgress
                            size={14}
                            sx={{ position: 'absolute', right: -20 }}
                          />
                        )}
                      </Box>
                    </Box>
                  )}

                  <Divider sx={{ my: 1 }} />

                  <Box display="flex" justifyContent="space-between">
                    <Typography variant="body1" fontWeight="bold">
                      {t('Total Estimated Fees')}:
                    </Typography>
                    <Box display="flex" alignItems="center" position="relative">
                      <Typography
                        variant="body1"
                        fontWeight="bold"
                        color="primary.main"
                      >
                        {feeEstimation.totalFee.toFixed(6)} SOL
                      </Typography>
                      {feeEstimation.totalFeeFallback && (
                        <Box
                          component="span"
                          sx={{
                            ml: 0.5,
                            color: 'warning.main',
                            fontSize: '0.7rem',
                          }}
                        >
                          {t('Estimated results')}
                        </Box>
                      )}
                      {feeEstimation.isLoading && (
                        <CircularProgress
                          size={14}
                          sx={{ position: 'absolute', right: -20 }}
                        />
                      )}
                    </Box>
                  </Box>

                  {/* SOLの場合は合計必要額（手数料+送金額）を表示 */}
                  {selectedToken === 'SOL' && (
                    <>
                      <Divider sx={{ my: 1 }} />
                      <Box display="flex" justifyContent="space-between">
                        <Typography variant="body1" fontWeight="bold">
                          {t('Total Required SOL')}:
                        </Typography>
                        <Box
                          display="flex"
                          alignItems="center"
                          position="relative"
                        >
                          <Typography
                            variant="body1"
                            fontWeight="bold"
                            color="error.main"
                          >
                            {(feeEstimation.totalFee + totalAmount).toFixed(6)}{' '}
                            SOL
                          </Typography>
                          <Box
                            component="span"
                            sx={{ ml: 0.5, fontSize: '0.7rem' }}
                          >
                            ({t('Fee + Amount')})
                          </Box>
                          {feeEstimation.isLoading && (
                            <CircularProgress
                              size={14}
                              sx={{ position: 'absolute', right: -20 }}
                            />
                          )}
                        </Box>
                      </Box>
                    </>
                  )}

                  {selectedToken !== 'SOL' &&
                    accountsNeedingCreation.length > 0 && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        mt={0.5}
                      >
                        * {t('Creating')} {accountsNeedingCreation.length}{' '}
                        {t('new token accounts')}
                        {accountsNeedingCreation.includes('estimated') &&
                          ' (' + t('Part of the estimated results') + ')'}
                      </Typography>
                    )}
                  {selectedToken == 'SOL' && (
                    <Typography
                      variant="caption"
                      color="text.secondary"
                      mt={0.5}
                    >
                      {t('Total amount')}: {totalAmount.toFixed(6)}{' '}
                      {selectedTokenInfo.symbol}
                    </Typography>
                  )}
                </Box>
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
              {transferLoading ? (
                <>
                  <CircularProgress size={20} sx={{ color: '#fff', mr: 1 }} />
                  {t(processingMessage)}...
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
                <Box display="flex" alignItems="center" gap={1}>
                  <Typography variant="h6" gutterBottom>
                    {t('Recent Transactions')}
                  </Typography>
                </Box>

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
