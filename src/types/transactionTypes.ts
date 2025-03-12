// インターフェース定義
export interface TransactionResult {
  signature: string;
  status: 'success' | 'error' | 'warn';
  timestamp: number;
  error?: string;
  errorMessage?: string;
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
}
