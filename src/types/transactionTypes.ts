// インターフェース定義
export interface TransactionResult {
  signature: string;
  status: 'success' | 'error' | 'warn';
  timestamp: number;
  error: string;
  errorMessage: string;
  recipients: AddressEntry[];
  totalAmount: number;
  token: string;
}

// アドレスとその送金金額のインターフェース
export interface AddressEntry {
  address: string;
  amount: number;
}

export interface Serializer {
  // シリアライザ
  results: TransactionResult[];
  uuid: string;
  timestamp: string; //（ISO形式をYYYYMMDDTHHMMSSZ形式に変換）
  senderWallet: string;
  tokenType: string;
  tokenSymbol: string;
  tokenMintAddress: string;
}

// CSVからインポートされた受取人情報
export interface Recipient {
  walletAddress: string;
  amount: number;
}
