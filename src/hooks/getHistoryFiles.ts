import axios from 'axios';
import { useState, useEffect } from 'react';
import { Serializer, AddressEntry } from '@/types/transactionTypes';

interface HistoryFilesResponse {
  files: string[];
}

interface CSVRow {
  uuid: string;
  signature: string;
  status: string;
  error: string;
  error_message: string;
  sender_wallet: string;
  token_type: string;
  token_symbol: string;
  token_mint_address: string;
  time_stamp: string;
  recipient_wallet: string;
  amount: string;
}

interface UseHistoryFilesResult {
  files: string[];
  serializers: Serializer[];
  loading: boolean;
  error: string | null;
}

export const getHistoryFiles = (
  walletAddress: string | null
): UseHistoryFilesResult => {
  const [files, setFiles] = useState<string[]>([]);
  const [serializers, setSerializers] = useState<Serializer[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!walletAddress) {
        setFiles([]);
        setSerializers([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Get the first character of the wallet address to determine the directory
        const firstChar = walletAddress.charAt(0);
        const directoryPath = `csv/${firstChar}/${walletAddress}`;

        const hostURL =
          import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

        const frontendURL =
          import.meta.env.VITE_FRONTEND_URL || 'http://localhost:5173';

        // Fetch the list of files directly from the public directory
        const response = await axios.get<HistoryFilesResponse>(
          `${hostURL}/api/csv/${walletAddress}`,
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        const fileNames: string[] = response.data.files;

        // Generate Serializer data from files
        const serializersData: Serializer[] = [];

        for (const fileName of fileNames) {
          try {
            // Get CSV file content
            const csvResponse = await axios.get(
              `${frontendURL}/${directoryPath}/${fileName}`
            );
            const csvContent = csvResponse.data;

            // Parse CSV
            const rows = parseCSV(csvContent);

            if (rows.length > 0) {
              // Group rows by signature
              const groupedBySignature = groupBySignature(rows);

              // 各ファイルに対して1つのシリアライザーを作成
              const firstEntry = rows[0];
              const serializer: Serializer = {
                uuid: firstEntry.uuid,
                timestamp: firstEntry.time_stamp,
                senderWallet: firstEntry.sender_wallet,
                tokenType: firstEntry.token_type,
                tokenSymbol: firstEntry.token_symbol,
                tokenMintAddress: firstEntry.token_mint_address,
                results: [],
              };

              // 各署名グループをresults配列に追加
              for (const [signature, entries] of Object.entries(
                groupedBySignature
              )) {
                if (entries.length > 0) {
                  // Get transaction info from the first entry
                  const firstEntryInGroup = entries[0];

                  // Create recipients array
                  const recipients: AddressEntry[] = entries.map((row) => ({
                    address: row.recipient_wallet,
                    amount: parseFloat(row.amount),
                  }));

                  // Calculate total amount
                  const totalAmount = recipients.reduce(
                    (sum, entry) => sum + entry.amount,
                    0
                  );

                  // Parse timestamp
                  const date = parseTimestamp(firstEntryInGroup.time_stamp);

                  // 結果オブジェクトを作成してシリアライザーのresultsに追加
                  serializer.results.push({
                    signature: firstEntryInGroup.signature,
                    status:
                      firstEntryInGroup.status === 'success'
                        ? 'success'
                        : 'error',
                    timestamp: date.getTime(),
                    error: firstEntryInGroup.error,
                    errorMessage: firstEntryInGroup.error_message,
                    recipients,
                    totalAmount,
                    token:
                      firstEntryInGroup.token_symbol ||
                      firstEntryInGroup.token_type,
                  });
                }
              }

              // ファイル全体のシリアライザーをリストに追加
              serializersData.push(serializer);
            }
          } catch (err) {
            console.error(`Error processing file ${fileName}:`, err);
            // Continue processing other files
          }
        }

        setSerializers(serializersData);
      } catch (err) {
        console.error('Error fetching files:', err);
        setFiles([]);
        setSerializers([]);
        setError(
          err instanceof Error
            ? err.message
            : 'ファイル一覧の取得中にエラーが発生しました'
        );
      } finally {
        setLoading(false);
      }
    };

    fetchFiles();
  }, [walletAddress]);

  return { files, serializers, loading, error };
};

// Group rows by signature
function groupBySignature(rows: CSVRow[]): Record<string, CSVRow[]> {
  // mapにかえる？
  const grouped: Record<string, CSVRow[]> = {};

  for (const row of rows) {
    if (!grouped[row.signature]) {
      grouped[row.signature] = [];
    }
    grouped[row.signature].push(row);
  }

  return grouped;
}

// Parse CSV function
function parseCSV(csvContent: string): CSVRow[] {
  const lines = csvContent.split('\n');
  const result: CSVRow[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line) {
      const values = line.split(',');
      if (values.length >= 12) {
        result.push({
          uuid: values[0],
          signature: values[1],
          status: values[2],
          error: values[3],
          error_message: values[4],
          sender_wallet: values[5],
          token_type: values[6],
          token_symbol: values[7],
          token_mint_address: values[8],
          time_stamp: values[9],
          recipient_wallet: values[10],
          amount: values[11],
        });
      }
    }
  }

  return result;
}

// Parse timestamp function
function parseTimestamp(timestamp: string): Date {
  // Example: 20250210T045040Z
  const year = parseInt(timestamp.substring(0, 4));
  const month = parseInt(timestamp.substring(4, 6)) - 1; // JavaScript months start at 0
  const day = parseInt(timestamp.substring(6, 8));
  const hour = parseInt(timestamp.substring(9, 11));
  const minute = parseInt(timestamp.substring(11, 13));
  const second = parseInt(timestamp.substring(13, 15));

  return new Date(Date.UTC(year, month, day, hour, minute, second));
}
