/**
 * APIエンドポイントにデータを送信するユーティリティ関数
 */
import { Metaplex } from '@metaplex-foundation/js';
import { Connection, PublicKey } from '@solana/web3.js';

interface Transaction {
  recipientWallet: string;
  amount: number;
}

export interface SignaturePayload {
  signature: string;
  senderWallet: string;
  status: string;
  error: string | null;
  errorMessage: string;
  tokenType: string;
  timeStamp: string;
  tokenSymbol: string;
  tokenMintAddress: string;
  uuid: string;
  transactions: Transaction[];
}

/**
 * ISO形式の日付文字列を "20250210T015040Z" 形式に変換する
 * @param isoString ISO形式の日付文字列 (例: "2025-02-10T01:50:40.000Z")
 * @returns フォーマット済みのタイムスタンプ文字列 (例: "20250210T015040Z")
 */
export const convertISOToCustomFormat = (isoString: string): string => {
  // ISO文字列から日付オブジェクトを作成
  const date = new Date(isoString);

  // フォーマットされた文字列を生成
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  const seconds = String(date.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

/**
 * mintアドレスからトークンシンボルを取得する
 * 既知のマッピングから取得できない場合はSolanaネットワークから取得を試みる
 *
 * @param mintAddress トークンのmintアドレス
 * @param connection オプションのSolana Connection オブジェクト
 * @returns トークンシンボル、または取得できない場合は空文字列
 */
export const getTokenSymbolFromMint = async (
  mintAddress: string,
  connection?: Connection
): Promise<string> => {
  // connectionオブジェクトがある場合、トークンメタデータを取得
  if (connection) {
    try {
      console.log('トークン情報を取得中:', mintAddress);

      // デフォルトのシンボル
      let symbol = 'UNKNOWN';

      try {
        // PublicKeyが有効かチェック
        const mintPubkey = new PublicKey(mintAddress);

        // ローカル環境でトークンデータを取得
        if (typeof window !== 'undefined') {
          // ローカルストレージからキャッシュを試みる
          const cachedData = localStorage.getItem(
            `token_metadata_${mintAddress}`
          );
          if (cachedData) {
            const parsed = JSON.parse(cachedData);
            if (parsed && parsed.symbol) {
              return parsed.symbol;
            }
          }
        }

        // Metaplexを使用してトークンメタデータを取得
        const metaplex = new Metaplex(connection);
        try {
          // NFTまたはSPLトークンのメタデータを取得
          const nftOrSft = await metaplex
            .nfts()
            .findByMint({ mintAddress: mintPubkey });

          if (nftOrSft && nftOrSft.symbol) {
            symbol = nftOrSft.symbol;

            // キャッシュに保存
            if (typeof window !== 'undefined') {
              localStorage.setItem(
                `token_metadata_${mintAddress}`,
                JSON.stringify({ symbol: nftOrSft.symbol })
              );
            }
          }
        } catch (metaplexError) {
          console.log('Metaplexでのメタデータ取得に失敗:', metaplexError);

          // メタプレックスでの取得に失敗した場合、ミントアドレスから短い識別子を作成
          const shortAddr = `${mintAddress.slice(0, 4)}...${mintAddress.slice(-4)}`;
          symbol = `TOKEN-${shortAddr}`;
        }
      } catch (err) {
        console.error('Mint情報の取得に失敗:', err);
      }

      return symbol;
    } catch (error) {
      console.error('トークンメタデータの取得に失敗:', error);
      return 'UNKNOWN';
    }
  }

  // 取得できない場合はUNKNOWNを返す
  return 'UNKNOWN';
};

/**
 * SignaturePayloadオブジェクトのtokenSymbolをmintアドレスから自動設定する
 *
 * @param payload 更新するSignaturePayloadオブジェクト
 * @param connection オプションのSolana Connection オブジェクト
 * @returns 更新されたSignaturePayload (tokenSymbolが設定される)
 */
export const setTokenSymbolFromMint = async (
  payload: SignaturePayload,
  connection?: any
): Promise<SignaturePayload> => {
  // mintアドレスが指定されていない場合は何もしない
  if (!payload.tokenMintAddress) {
    return payload;
  }

  // シンボルを取得
  const symbol = await getTokenSymbolFromMint(
    payload.tokenMintAddress,
    connection
  );

  // ペイロードを更新（元のオブジェクトを変更せず新しいオブジェクトを返す）
  return {
    ...payload,
    tokenSymbol: symbol || payload.tokenSymbol || '',
  };
};

/**
 * 現在のタイムスタンプを指定された形式で生成する
 * @returns フォーマット済みのタイムスタンプ文字列 (例: "20250210T015040Z")
 */
export const generateTimeStamp = (): string => {
  const now = new Date();

  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const hours = String(now.getUTCHours()).padStart(2, '0');
  const minutes = String(now.getUTCMinutes()).padStart(2, '0');
  const seconds = String(now.getUTCSeconds()).padStart(2, '0');

  return `${year}${month}${day}T${hours}${minutes}${seconds}Z`;
};

/**
 * ウォレットアドレスの有効性を検証する
 * @param address 検証するウォレットアドレス
 * @returns アドレスが有効な場合はtrue
 */
export const isValidWalletAddress = (address: string): boolean => {
  // Solanaウォレットアドレスは通常44文字のBase58文字列
  // より厳密な検証が必要な場合は、@solana/web3.jsのPublicKeyを使用する
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
};

/**
 * トランザクションデータの検証を行う
 * @param transactions 検証するトランザクション配列
 * @returns エラーメッセージの配列、問題がなければ空配列
 */
export const validateTransactions = (transactions: Transaction[]): string[] => {
  const errors: string[] = [];

  if (!transactions || transactions.length === 0) {
    errors.push('トランザクションが指定されていません');
    return errors;
  }

  transactions.forEach((tx, index) => {
    if (!tx.recipientWallet) {
      errors.push(
        `トランザクション #${index + 1}: 受信者ウォレットが指定されていません`
      );
    } else if (!isValidWalletAddress(tx.recipientWallet)) {
      errors.push(
        `トランザクション #${index + 1}: 無効な受信者ウォレットアドレスです`
      );
    }

    if (tx.amount === undefined || tx.amount === null) {
      errors.push(`トランザクション #${index + 1}: 金額が指定されていません`);
    } else if (isNaN(tx.amount) || tx.amount <= 0) {
      errors.push(
        `トランザクション #${index + 1}: 金額は正の数値である必要があります`
      );
    }
  });

  return errors;
};

/**
 * 署名データをAPIエンドポイントに送信する関数
 * @param data 送信するデータ
 * @param autoSetTokenSymbol シンボルの自動設定を有効にするかどうか
 * @param connection オプションのSolana Connection オブジェクト
 * @returns レスポンスデータ
 */
export const postSignatureData = async (
  data: SignaturePayload,
  autoSetTokenSymbol: boolean = true,
  connection?: any
): Promise<void> => {
  try {
    let payloadToSend = { ...data };

    // トークンシンボルの自動設定
    if (
      autoSetTokenSymbol &&
      data.tokenMintAddress &&
      (!data.tokenSymbol || data.tokenSymbol === '')
    ) {
      payloadToSend = await setTokenSymbolFromMint(data, connection);
    }

    const response = await fetch('http://localhost:3000/api/signature', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloadToSend),
    });

    if (!response.ok) {
      throw new Error(`APIリクエストエラー: ${response.status}`);
    }

    return;
  } catch (error) {
    throw new Error(`MultiSenderServerError : ${error}`);
  }
};
