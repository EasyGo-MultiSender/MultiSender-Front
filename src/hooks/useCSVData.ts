import { useState, useEffect } from 'react';
import axios from 'axios';
import { Serializer, AddressEntry } from '../types/transactionTypes';
import { v4 as uuidv4 } from 'uuid';

interface CSVRow {
  address: string;
  amount: string;
}

export const useCSVData = (files: string[], walletAddress: string | null) => {
  const [serializers, setSerializers] = useState<Serializer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCSVData = async () => {
      if (!files.length || !walletAddress) {
        setSerializers([]);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const serializersData: Serializer[] = [];

        for (const filePath of files) {
          try {
            // ファイルパスからファイル名を抽出
            const fileName = filePath.split('/').pop() || '';
            // ファイル名からタイムスタンプとトークン名を抽出
            const [timestamp, token] = fileName.split('_');
            const tokenName = token.replace('.csv', '').toUpperCase();

            // CSVファイルの内容を取得
            const response = await axios.get(
              `/csv/${walletAddress}/${fileName}`
            );
            const csvContent = response.data;

            // CSVをパース
            const rows = parseCSV(csvContent);

            if (rows.length > 0) {
              // タイムスタンプをDate型に変換
              const date = parseTimestamp(timestamp);

              // 受取人と金額の配列を作成
              const recipients: AddressEntry[] = rows.map((row) => ({
                address: row.address,
                amount: parseFloat(row.amount),
              }));

              // 合計金額を計算
              const totalAmount = recipients.reduce(
                (sum, entry) => sum + entry.amount,
                0
              );

              // Serializerオブジェクトを作成
              const serializer: Serializer = {
                uuid: uuidv4(),
                results: [
                  {
                    signature: `sig-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                    status: 'success',
                    timestamp: date.getTime(),
                    recipients,
                    totalAmount,
                    token: tokenName,
                  },
                ],
              };

              serializersData.push(serializer);
            }
          } catch (err) {
            console.error(`Error processing file ${filePath}:`, err);
            // エラーが発生しても処理を続行
          }
        }

        setSerializers(serializersData);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : 'CSVデータの取得中にエラーが発生しました'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchCSVData();
  }, [files, walletAddress]);

  return { serializers, loading, error };
};

// CSVをパースする関数
function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.split('\n');
  const result: CSVRow[] = [];

  // ヘッダー行をスキップ
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const [address, amount] = line.split(',');
      if (address && amount) {
        result.push({ address, amount });
      }
    }
  }

  return result;
}

// タイムスタンプをパースする関数
function parseTimestamp(timestamp: string): Date {
  // 例: 20250210T045040Z
  const year = parseInt(timestamp.substring(0, 4));
  const month = parseInt(timestamp.substring(4, 6)) - 1; // JavaScriptの月は0から始まる
  const day = parseInt(timestamp.substring(6, 8));
  const hour = parseInt(timestamp.substring(9, 11));
  const minute = parseInt(timestamp.substring(11, 13));
  const second = parseInt(timestamp.substring(13, 15));

  return new Date(Date.UTC(year, month, day, hour, minute, second));
}
