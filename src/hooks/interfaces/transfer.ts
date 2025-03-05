export interface TransferParams {
  recipients: string[];
  amount: number;
  mint?: string;
}

export interface TransferResult {
  signature: string;
  status: 'success' | 'error';
  error?: string;
  timestamp: number;
  recipients: string[];
  amounts?: number[];
}
