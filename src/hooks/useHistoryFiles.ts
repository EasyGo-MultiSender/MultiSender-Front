import { useState, useEffect } from 'react';
import axios from 'axios';

interface HistoryFilesResponse {
  files: string[];
}

interface UseHistoryFilesResult {
  files: string[];
  loading: boolean;
  error: string | null;
}

export const useHistoryFiles = (
  walletAddress: string | null
): UseHistoryFilesResult => {
  const [files, setFiles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFiles = async () => {
      if (!walletAddress) {
        setFiles([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        const response = await axios.get<HistoryFilesResponse>(
          `http://localhost:3000/api/csv/${walletAddress}`
        );
        setFiles(response.data.files);
        console.log(response.data.files);
      } catch (err) {
        setFiles([]);
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

  return { files, loading, error };
};
