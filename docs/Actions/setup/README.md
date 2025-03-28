# GitHub Actions 初期設定ガイド

このドキュメントでは、BulkSender-Frontプロジェクトの自動デプロイを実現するための GitHub Actions の初期設定方法について詳しく説明します。

## 目次

- [前提条件](#前提条件)
- [シークレットの設定](#シークレットの設定)
- [IAM設定](#iam設定)
- [ワークフロー設定ファイルの確認](#ワークフロー設定ファイルの確認)
- [トラブルシューティング](#トラブルシューティング)

## 前提条件

GitHub Actionsを設定する前に、以下の項目が準備されていることを確認してください：

1. AWS アカウントへのアクセス権限（IAMユーザー作成権限を含む）
2. GitHub リポジトリの管理者権限
3. デプロイ先の情報（S3バケット名、CloudFrontディストリビューションIDなど）

## シークレットの設定

GitHub Actionsのワークフローで安全にAWSリソースにアクセスするために、以下のシークレットをGitHub上で設定する必要があります：

1. GitHub リポジトリのページにアクセスします
2. リポジトリの「Settings」タブをクリックします
3. 左サイドバーから「Secrets and variables」→「Actions」を選択します
4. 「New repository secret」ボタンをクリックして、以下のシークレットを追加します：

| シークレット名 | 説明 | 例/フォーマット |
|--------------|------|---------------|
| `AWS_PROD_SECRET_ACCESS_KEY` | 本番環境用IAMユーザーのシークレットアクセスキー | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_STG_SECRET_ACCESS_KEY` | ステージング環境用IAMユーザーのシークレットアクセスキー | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_PROD_ACCESS_KEY_ID` | 本番環境用IAMユーザーのアクセスキーID | `AKIAIOSFODNN7EXAMPLE` |
| `AWS_STG_ACCESS_KEY_ID` | ステージング環境用IAMユーザーのアクセスキーID | `AKIAIOSFODNN7EXAMPLE` |

> **注意**: シークレットは一度保存すると、その値を再表示することはできません。間違いがないように慎重に入力してください。

## IAM設定

GitHub Actionsが適切なAWSリソースにアクセスできるように、IAMユーザーを作成し、必要な権限を付与します。

### 本番環境およびステージング環境用のIAMユーザーの作成

1. AWSマネジメントコンソールにログインします
2. IAMサービスに移動します
3. 「ユーザー」→「ユーザーを作成」をクリックします
4. 以下の設定でユーザーを作成します：
   - ユーザー名: `github-actions-prod`（本番環境用）または `github-actions-stg`（ステージング環境用）
   - アクセスキーの種類: プログラムによるアクセス

### 必要なIAMポリシーの設定

以下のポリシーをそれぞれのIAMユーザーにアタッチします：

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "s3:GetObject",
                "s3:ListBucket",
                "s3:DeleteObject"
            ],
            "Resource": [
                "arn:aws:s3:::your-bucket-name/*",
                "arn:aws:s3:::your-bucket-name"
            ]
        },
        {
            "Effect": "Allow",
            "Action": [
                "cloudfront:CreateInvalidation"
            ],
            "Resource": "arn:aws:cloudfront::account-id:distribution/distribution-id"
        }
    ]
}
```

> **注意**: `your-bucket-name`、`account-id`、`distribution-id` は実際の値に置き換えてください。

## ワークフロー設定ファイルの確認

プロジェクトリポジトリの `.github/workflows` ディレクトリにある設定ファイルを確認し、必要に応じて修正します：

- `deploy.yml`: メインのデプロイワークフロー
- `pr-check.yml`: プルリクエスト時の自動チェックワークフロー

## トラブルシューティング

### 一般的な問題と解決策

1. **デプロイに失敗する場合**
   - GitHub Secretsが正しく設定されているか確認
   - IAMユーザーに適切な権限が付与されているか確認
   - ワークフローログでエラーメッセージを確認

2. **アクセス権限エラー**
   - IAMポリシーが正しく設定されているか確認
   - リソース識別子（ARN）が正しいか確認

3. **S3へのアップロードエラー**
   - S3バケットが存在するか確認
   - バケットポリシーが正しく設定されているか確認

4. **CloudFront無効化エラー**
   - CloudFrontディストリビューションIDが正しいか確認
   - IAMユーザーがCloudFront無効化権限を持っているか確認

### ログの確認方法

1. GitHubリポジトリの「Actions」タブをクリック
2. 該当するワークフロー実行をクリック
3. 失敗したジョブをクリックして詳細を確認

---

設定に関する質問や問題がある場合は、プロジェクト管理者にお問い合わせください。