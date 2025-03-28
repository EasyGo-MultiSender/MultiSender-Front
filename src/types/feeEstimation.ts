/**
 * トランザクション手数料計算の進行状態
 */
export interface FeeEstimationProgress {
  current: number; // 現在処理中の項目番号
  total: number; // 合計処理項目数
  step: string; // 現在の処理ステップ名
}

/**
 * トランザクション手数料計算の結果
 */
export interface FeeEstimation {
  totalFee: number; // 合計手数料（SOL）
  accountCreationFees: number; // アカウント作成にかかる手数料
  transactionFees: number; // 通常トランザクション手数料
  operationFees: number; // 運営手数料
  isLoading: boolean; // 計算中フラグ
  simulatedSuccess: boolean; // シミュレーション成功フラグ
  transactionFeeFallback: boolean; // トランザクション手数料がフォールバック値かどうか
  accountCreationFeeFallback: boolean; // アカウント作成手数料がフォールバック値かどうか
  totalFeeFallback: boolean; // 合計手数料がフォールバック値かどうか
  progress: FeeEstimationProgress; // 進捗状態
}
