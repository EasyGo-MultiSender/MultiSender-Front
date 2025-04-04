# <p align="center">EasyGo Multisender Front</p>
### <p align="center">The New Standard for Fast, Low-Cost Solana Airdrops</p>
[![Test](https://github.com/EasyGo-MultiSender/MultiSender-Front/actions/workflows/test.yml/badge.svg)](https://github.com/EasyGo-MultiSender/MultiSender-Front/actions/workflows/test.yml)
[![Test Deploy](https://github.com/EasyGo-MultiSender/MultiSender-Front/actions/workflows/test_deploy.yml/badge.svg)](https://github.com/EasyGo-MultiSender/MultiSender-Front/actions/workflows/test_deploy.yml)

## 機能一覧

### 共通機能

- [ ] ヘッダー
  - [ ] ロゴの表示、リンク
  - [ ] タイトルの表示、リンク
  - [ ] Sender、Historyページへのリンク
  - [ ] 言語切り替えの表示、切り替え
    - [ ] 日本語
    - [ ] English
  - [ ] ネットワーク切り替えの表示、切り替え
  - [ ] Walletボタンの表示、クリック

- [ ] フッター
  - [ ] Google RECAPTCHAのアイコン表示、リンク
  - [ ] ContactUsの表示
  - [ ] メールアイコンの表示、リンク (contact@easy-go.me)
  - [ ] Xアイコンの表示、リンク (https://x.com/easymultisender)
  - [ ] ヘルプセンターの表示、リンク (https://murasakibv.medium.com/)

- [ ] ウォレット接続
  - [ ] Phantom , Solflare , Backpackでの接続
  - [ ] 接続後のウォレットロゴ、ウォレットアドレス表示
  - [ ] 「Copy address」機能の動作確認
  - [ ] 「Change Wallet」機能の動作確認
  - [ ] 「Disconnect」機能の動作確認

- [ ] クリップボード操作
  - [ ] クリップボードからの貼り付け
  - [ ] トランザクション詳細のコピー
  - [ ] ウォレットアドレスのコピー

### 送信ページ

- [ ] SOLの表示
  - [ ] ウォレット残高の表示
  - [ ] ウォレットアドレスの表示、コピー

- [ ] トークン選択
  - [ ] TokenListライブラリからのSPLトークンの読み込み(USDC,GMT...etc)
  - [ ] TokenProgramからのSPLトークンの読み込み(Bonk,JUP...etc)
  - [ ] Token2022ProgramからのSPLトークンの読み込み(fragSOL,CHAPTER2...etc)
  - [ ] トークンの残高表示
  - [ ] 「SHOW MORE」ボタンの表示、クリック

- [ ] 入力検証
  - [ ] SOLの名前、アイコン表示
  - [ ] SPLトークンの名前、アイコン表示
  - [ ] トークンが選択できるか
  - [ ] 入力フォームバリデーションチェック
    - [ ] 重複アドレスの検出
    - [ ] 00001などの不正な入力値の検出
    - [ ] SOL選択時に${VITE_DEPOSIT_MINIMUMS_SOL_AMOUNT}未満の送金額の検出
    - [ ] 無効なウォレットアドレスの検出
  - [ ] CSV操作
    - [ ] テンプレートのダウンロード
    - [ ] CSVファイルのアップロード
    - [ ] CSV内容の正確な解析
    - [ ] 無効なCSVフォーマットの処理

- [ ] シミュレーション表示
  - [ ] 送信シミュレーション
    - [ ] 送信ウォレットアドレスの表示
    - [ ] 合計送信枚数の表示
    - [ ] トランザクション数の表示
    - [ ] SOL数量の表示
  - [ ] SOL数量シミュレーション
    - [ ] トランザクション手数料の表示
    - [ ] 運営手数料の表示
    - [ ] 見積の表示
    - [ ] 必要SOL数量の表示

- [ ] バッチ処理(devnet / mainnet-beta別)
  - [ ] 実行前の確認
    - [ ] ウォレットアプリの確認
    - [ ] ウォレットアプリ上でのトランザクション確認
    - [ ] ウォレットアプリの署名確認
  - [ ] 実行中の確認
    - [ ] 送信ボタンの無効化
    - [ ] 送信中の処理進捗表示
  - [ ] 実行後の確認
    - [ ] SOL送金結果の確認（バッチあたり最大${VITE_SOL_TRANSFER_BATCH_SIZE}件）
    - [ ] SPLトークン送金結果の確認（バッチあたり最大${VITE_SPL_TRANSFER_BATCH_SIZE}件）
    - [ ] 運営手数料の確認
    - [ ] 成功の確認
      - [ ] バッチ処理に成功し、バックエンドにトランザクションが送信されたことの確認
      - [ ] バッチ処理に成功し、バックエンドにトランザクションが送信されなかったことの確認
    - [ ] 失敗の確認
      - [ ] バッチ処理に失敗し、バックエンドにトランザクションが送信されたことの確認
      - [ ] バッチ処理に失敗し、バックエンドにトランザクションが送信されなかったことの確認

- [ ] 送信履歴
  - [ ] シリアライザごとの表示
    - [ ] 送信トークンタイプ(SOL/SPL)の表示
    - [ ] 実行時間の表示
    - [ ] 実行数と成功数の表示
    - [ ] 送信量の表示
    - [ ] ダウンロードボタンの表示、クリック
    - [ ] 展開ボタンの表示、クリック
  - [ ] トランザクションごとの表示
    - [ ] トランザクションステータスの表示
    - [ ] 実行時間の表示
    - [ ] ダウンロードボタンの表示、クリック
    - [ ] トランザクションID(シグネチャ)の表示、URLリンク、コピー
    - [ ] 送信先アドレス、各送信先の送金額の表示、一括コピー

### 履歴ページ

- [ ] ウォレットアドレスの表示、コピー

- [ ] 送信履歴
  - [ ] シリアライザごとの表示
    - [ ] 送信トークンタイプ(SOL/SPL)の表示
    - [ ] 実行時間の表示
    - [ ] 実行数と成功数の表示
    - [ ] 送信量の表示
    - [ ] ダウンロードボタンの表示、クリック
    - [ ] 展開ボタンの表示、クリック
  - [ ] トランザクションごとの表示
    - [ ] トランザクションステータスの表示
    - [ ] 実行時間の表示
    - [ ] ダウンロードボタンの表示、クリック
    - [ ] トランザクションID(シグネチャ)の表示、URLリンク、コピー
    - [ ] 送信先アドレス、各送信先の送金額の表示、一括コピー
