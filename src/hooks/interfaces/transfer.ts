import { AddressEntry } from '@/types/transactionTypes.ts';

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

export interface CSVValidationResult {
  invalidLineNumbers: number[];
  entries: AddressEntry[];
  duplicateLineNumbers: number[];
  duplicates: string[];
  belowMinimumSolLines: string[];
  belowMinimumSolLineNumbers: number[];
  invalidAddressNumbers: number[];
  invalidSolNumbers: number[];
}

export interface OperationFee {
  operationFeePerTx: number;
  estimatedTxCount: number;
  operationFees: number;
  transactionFee: number;
}
