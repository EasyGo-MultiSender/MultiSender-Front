# 環境設定ガイド

このドキュメントでは、BulkSender-Frontプロジェクトで使用される環境変数について説明します。

## 基本設定

### 環境タイプ
- `VITE_ENV`: 環境タイプを指定
  - 例: `development`（開発環境）, `production`（本番環境）

### URL設定
- `VITE_BACKEND_URL`: バックエンドサービスのURL
  - 例: `https://multisender.easy-go.me` (本番例)
  - 例: `http://localhost:3000` (開発例)
- `VITE_FRONTEND_URL`: フロントエンドサービスのURL
  - 例: `https://multisender.easy-go.me` (本番例)
  - 例: `http://localhost:5173` (開発例)

## Solanaネットワーク設定

### ネットワーク設定
- `VITE_SOLANA_DEV_NETWORK`: 開発用ネットワーク
  - 例: `devnet`
- `VITE_SOLANA_NETWORK`: 本番用ネットワーク
  - 例: `mainnet-beta`

### RPCエンドポイント
- `VITE_SOLANA_DEV_RPC_ENDPOINT`: 開発用RPCエンドポイント
  - 例: `https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY`
- `VITE_RPC_ENDPOINT`: 本番用RPCエンドポイント
  - 例: `https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY`
- `VITE_RPC_RATE_LIMIT`: RPCレート制限（ミリ秒）
  - RPCリクエストの間隔を指定します。過剰なリクエストによるTo Many Requestsエラーを防ぐために使用します。
  - 例: `1000`（1.0秒）

## プログラムID(Smart Contract)設定
- `VITE_TOKEN_PROGRAM_ID`: トークンプログラムID
  - 例: `TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA`
- `VITE_TOKEN_2022_PROGRAM_ID`: Token 2022プログラムID
  - 例: `TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`
- `VITE_METAPLEX_PROGRAM_ID`: MetaplexプログラムID
  - 例: `metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s`

## トランザクション設定

### バッチサイズ
- `VITE_SOL_TRANSFER_BATCH_SIZE`: 1回のトランザクションで送信するSOLトークンの最大数
  - 例: `19`
- `VITE_SPL_TRANSFER_BATCH_SIZE`: 1回のトランザクションで送信するSPLトークンの最大数
  - 例: `9`
- `VITE_MAX_SIGN_BATCH`: 1回の署名で送信するトランザクションの最大数
  - 例: `15`

#### 1回の署名で送信可能なウォレット数
- `VITE_SOL_TRANSFER_BATCH_SIZE` x `VITE_MAX_SIGN_BATCH` = 285 件まで1回の署名で送信可能
- `VITE_SPL_TRANSFER_BATCH_SIZE` x `VITE_MAX_SIGN_BATCH` = 135 件まで1回の署名で送信可能

### 手数料設定
- `VITE_DEPOSIT_WALLET_ADDRESS`: 手数料の送信先ウォレットアドレス
  - 例: `87fPQZt4xnJDqsSZERSV36vXGtmrKV7KvX2oESvSsDEw`
- `VITE_DEPOSIT_SOL_AMOUNT`: 1トランザクションあたりの手数料（SOL）
  - トランザクション1回ごとに送信される手数料のSOL量を指定します。
  - 100件送信する
  - 例: `0.0075`
  #### 実行例
  - SOLを100件送信する場合、、、
  - `0.0075 SOL x 100ウォレット/19件ずつ = 0.045 SOL` となる
  - SPLを100件送信する場合、、、
  - `0.0075 SOL x 100ウォレット/9件ずつ = 0.09 SOL` となる
- `VITE_DEPOSIT_MINIMUMS_SOL_AMOUNT`: トランザクションの最小SOL量
  - SOL送信時に送信する最小SOL量を指定します。
  - アクティブになっていない `0.00089 SOL` 以下のSOLを送信する場合、エラーが発生します。
  - 例: `0.001`

### タイムアウト設定
- `VITE_TRANSACTION_TIMEOUT`: トランザクションのタイムアウト時間（ミリ秒）
  - 例: `120000`（2分）

## セキュリティ設定

### reCAPTCHA
- `VITE_RECAPTCHA_SITE_KEY`: reCAPTCHAのサイトキー
  - 例: `6LfzAfkqAAAAAKwf7q_dv-mjifwRHAUlhQaQ5Bn4`
- `VITE_RECAPTCHA_ACTIVE`: reCAPTCHAの有効/無効
  - 例: `false`(無効), `true`(有効)

### ウォレット制限
- `VITE_WALLET_ADDRESS_LIMIT`: ウォレットアドレスの最大数
  - ウォレットのフォームに入力できるアドレスの最大数を指定します。
  - 例: `1000`

## シミュレーション設定
- `VITE_SIMULATED_NETWORK`: シミュレーションネットワークの有効/無効
  - 例: `false`(無効), `true`(有効)
- `VITE_SIMULATED_SPL_TOKEN_ACCOUNT_FEE`: シミュレーション用のトークンアカウント作成手数料
  - 例: `0.00203928`
- `VITE_SIMULATED_TRANSACTION_FEE`: シミュレーション用のトランザクション手数料
  - 例: `0.000005`

## アナリティクス
- `VITE_GA_MEASUREMENT`: Google Analyticsの有効/無効
  - 例: `false`(無効), `true`(有効)
- `VITE_GA_MEASUREMENT_ID`: Google Analyticsの測定ID
  - 例: `G-XXXXXXXXXX`

## 設定例

### 開発環境
```env
VITE_ENV=development
VITE_BACKEND_URL=http://localhost:3000
VITE_FRONTEND_URL=http://localhost:5173
VITE_SOLANA_DEV_NETWORK=devnet
VITE_SOLANA_DEV_RPC_ENDPOINT=https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

### 本番環境
```env
VITE_ENV=production
VITE_BACKEND_URL=https://api.yourdomain.com
VITE_FRONTEND_URL=https://yourdomain.com
VITE_SOLANA_NETWORK=mainnet-beta
VITE_RPC_ENDPOINT=https://mainnet.helius-rpc.com/?api-key=YOUR_API_KEY
```

## 注意事項
- バッチサイズや制限値は、実際の使用状況に応じて調整してください
- トランザクション手数料やタイムアウトは、開発環境と本番環境の両方でテストしてください
- 本番環境では、reCAPTCHAなどのセキュリティ機能を有効にしてください
