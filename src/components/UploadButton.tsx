import { FileUpload } from '@mui/icons-material';
import { Button } from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COLORS } from '../constants/color';

// 受取人情報の型定義
interface Recipient {
  walletAddress: string;
  amount: number;
}

interface UploadProps {
  onRecipientsLoaded?: (recipients: Recipient[]) => void;
}

const Upload: React.FC<UploadProps> = ({ onRecipientsLoaded }) => {
  const { t } = useTranslation();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.style.display = 'none';
    document.body.appendChild(input);

    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        setIsProcessing(true);
        try {
          const reader = new FileReader();

          reader.onload = (event) => {
            const csvContent = event.target?.result as string;
            if (csvContent) {
              // CSVを行ごとに分割
              const lines = csvContent.split(/\r?\n/);

              // 各行をパースして受取人配列を作成
              const recipients: Recipient[] = [];

              // 全ての行を処理（ヘッダー行もスキップしない）
              for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue; // 空行をスキップ

                // カンマまたはタブ区切りの行を処理
                const parts = line.includes(',')
                  ? line.split(',')
                  : line.split(/\s+/);

                if (parts.length >= 2) {
                  const walletAddress = parts[0].trim();
                  // 数値に変換を試みる
                  const amountStr = parts[1].trim();
                  const amount = parseFloat(amountStr);

                  // 有効なアドレスと数値の場合のみ追加
                  if (walletAddress && !isNaN(amount)) {
                    recipients.push({
                      walletAddress,
                      amount,
                    });
                  }
                }
              }

              //   console.log("Parsed recipients:", recipients);

              // 親コンポーネントにデータを渡す
              if (onRecipientsLoaded) {
                onRecipientsLoaded(recipients);
              }
            }
            setIsProcessing(false);
          };

          reader.onerror = () => {
            console.error('Failed to read file');
            setIsProcessing(false);
          };

          reader.readAsText(file);
        } catch (error) {
          console.error('Error processing CSV:', error);
          setIsProcessing(false);
        }
      }

      // 処理終了後に入力要素をDOMから削除
      document.body.removeChild(input);
    };

    input.click();
  };

  return (
    <Button
      onClick={handleUpload}
      startIcon={<FileUpload />}
      disabled={isProcessing}
      variant="contained"
      sx={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '5px 10px',
        width: '100px',
        height: '32px',
        gap: '5px',
        marginTop: '8px',
        background: COLORS.BLUE.DARK,
        borderRadius: '6px',
        textTransform: 'none',
      }}
    >
      {isProcessing ? t('Processing...') : t('CSV')}
    </Button>
  );
};

export default Upload;
