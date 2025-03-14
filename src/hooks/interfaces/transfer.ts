export interface TransferParams {
  recipients: string[];
  amount: number;
  mint?: string;
}

export interface TransferResult {
  signature: string;
  status: 'success' | 'error' | 'warn';
  error: string;
  errorMessage: string;
  timestamp: number;
  recipients: string[];
  amounts?: number[];
}
