// インターフェース定義
export interface TransactionResult {
  signature: string;
  status: 'success' | 'error';
  timestamp: number;
  error?: string;
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
  // シリアライザー
  results: TransactionResult[];
  uuid: string;
}

export interface AllSerializer {
  serializer: Serializer[];
}
