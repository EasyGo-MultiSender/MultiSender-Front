// src/global.d.ts
export {}; // モジュールとして認識させるため

declare global {
  interface Window {
    phantom?: {
      solana?: any; // 本来は適切な型に置き換えるべきですが、とりあえず any で回避
    };
    xnft?: {
      solana?: any;
    };
  }

  // TransactionResult の型を拡張（受取人の詳細情報を追加）
  interface TransactionResult {
    recipientDetails?: any;
  }
}
