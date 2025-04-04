# GitHub Actions 初期設定ガイド

このドキュメントでは、`EasyGo-Front`および`EasyGo-Back`、プロジェクトの自動デプロイを実現するための GitHub Actions の初期設定方法について詳しく説明します。

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
3. デプロイ先の情報（S3バケット名、EC2インスタンスID、SSMドキュメント名など）

## シークレットの設定

GitHub Actionsのワークフローで安全にAWSリソースにアクセスするために、以下のシークレットをGitHub上で設定する必要があります：

1. GitHub リポジトリのページにアクセスします
2. リポジトリの「Settings」タブをクリックします
![スクリーンショット 2025-04-04 12 43 23](https://github.com/user-attachments/assets/a821be51-c974-4cd0-aca2-3a7e3a6cf1e5)
4. 左サイドバーから「Secrets and variables」→「Actions」を選択します
![スクリーンショット 2025-04-04 12 44 06](https://github.com/user-attachments/assets/41b15a61-0642-4e54-9902-f8e6077e7452)
6. 「New repository secret」ボタンをクリックして、以下のシークレットを追加します：
![スクリーンショット 2025-04-04 12 45 54](https://github.com/user-attachments/assets/231df039-9607-42b3-a230-ece31fef6518)

| シークレット名 | 説明 | 例/フォーマット |
|--------------|------|---------------|
| `AWS_PROD_SECRET_ACCESS_KEY` | 本番環境用IAMユーザーのシークレットアクセスキー | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `AWS_STG_SECRET_ACCESS_KEY` | ステージング環境用IAMユーザーのシークレットアクセスキー | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |

> **注意**: シークレットは一度保存すると、その値を再表示することはできません。再設定はできますが、間違いがないように慎重に入力してください。

## IAM設定

GitHub Actionsが適切なAWSリソースにアクセスできるように、IAMユーザーを作成し、必要な権限を付与します。

### 本番環境およびステージング環境用のIAMユーザーの作成

1. AWSマネジメントコンソールにログインします
2. IAMサービスに移動します
3. 「ユーザー」→「ユーザーを作成」をクリックします
4. 以下の設定でユーザーを作成します：
   - ユーザー名: `deploy`

### 必要なIAMポリシーの設定

IAMユーザーには、デプロイプロセスに必要な以下の権限が必要です：

1. **S3バケットへのアクセス権限**: デプロイアーカイブをアップロードするため
2. **SSMコマンド実行権限**: EC2インスタンスにデプロイコマンドを送信するため
3. **SSMセッション管理権限**: 必要に応じてインスタンスに接続するため

以下のポリシーをそれぞれのIAMユーザーにアタッチします：

```json
{
	"Version": "2012-10-17",
	"Statement": [
		{
			"Sid": "VisualEditor0",
			"Effect": "Allow",
			"Action": "ssm:StartSession",
			"Resource": [
				"arn:aws:ec2:us-east-1:343218188349:instance/i-03645a95b70be4aed",
				"arn:aws:ec2:us-east-1:343218188349:instance/i-07ca443c8a566e554",
				"arn:aws:ssm:us-east-1:343218188349:document/SSM-SessionManagerRunShell-Deploy"
			]
		},
		{
			"Sid": "VisualEditor1",
			"Effect": "Allow",
			"Action": [
				"ssm:ResumeSession",
				"ssm:TerminateSession"
			],
			"Resource": "arn:aws:ssm:*:*:session/${aws:username}-*"
		},
		{
			"Sid": "AllowSendCommand",
			"Effect": "Allow",
			"Action": [
				"ssm:SendCommand",
				"ssm:GetCommandInvocation",
				"ssm:ListCommands"
			],
			"Resource": [
				"arn:aws:ec2:us-east-1:343218188349:instance/i-03645a95b70be4aed",
				"arn:aws:ec2:us-east-1:343218188349:instance/i-07ca443c8a566e554",
				"arn:aws:ssm:*:*:document/AWS-RunShellScript",
				"arn:aws:ssm:us-east-1:343218188349:*"
			]
		},
		{
			"Effect": "Allow",
			"Action": [
				"s3:PutObject",
				"s3:GetObject",
				"s3:DeleteObject"
			],
			"Resource": [
				"arn:aws:s3:::multisender-deploy/deployments/*"
			]
		},
		{
			"Effect": "Allow",
			"Action": [
				"s3:ListBucket"
			],
			"Resource": [
				"arn:aws:s3:::multisender-deploy"
			]
		}
	]
}
```

### 各権限の説明

| 権限 | 目的 | 関連リソース |
|-----|-----|------------|
| ssm:StartSession | EC2インスタンスへのセッション接続を開始するため | EC2インスタンス, SSMドキュメント |
| ssm:ResumeSession, ssm:TerminateSession | セッション管理に使用 | セッションリソース |
| ssm:SendCommand | EC2インスタンスにコマンドを実行するため | EC2インスタンス, SSMドキュメント |
| ssm:GetCommandInvocation, ssm:ListCommands | コマンド実行状況の確認に使用 | コマンド実行リソース |
| s3:PutObject, s3:GetObject, s3:DeleteObject | S3バケットにデプロイアーカイブをアップロード/削除するため | S3オブジェクト |
| s3:ListBucket | S3バケット内のオブジェクトリストを取得するため | S3バケット |

## ワークフロー設定ファイルの確認

`.github/actions/env/aws`ディレクトリには、環境ごとのAWS設定ファイルが格納されています。環境の例です：

### .github/actions/env/aws/〇〇/action.yml
```yaml
name: AWS Environment Variables
description: AWS Environment Variables

outputs:
  AWS_〇〇_ACCESS_KEY_ID:
    description: 'AWS Staging Access Key ID'
    value: ${{ steps.set_env.outputs.AWS_〇〇_ACCESS_KEY_ID }}
  AWS_〇〇_INSTANCE_ID:
    description: 'AWS Staging Instance ID'
    value: ${{ steps.set_env.outputs.AWS_〇〇_INSTANCE_ID }}
  AWS_〇〇_REGION:
    description: 'AWS Staging Region'
    value: ${{ steps.set_env.outputs.AWS_〇〇_REGION }}

runs:
  using: "composite"
  steps:
    - name: Set AWS 〇〇 Environment Variables
      id: set_env
      env:
        AWS_INSTANCE_ID : i-07ca443c8a566e554
        AWS_REGION : us-east-1
        AWS_ACCESS_KEY_ID : AKIAU72LF6A66T7M2HEJ
      shell: bash
      run: |
        echo "AWS_STG_INSTANCE_ID=${AWS_INSTANCE_ID}" >> $GITHUB_OUTPUT
        echo "AWS_STG_REGION=${AWS_REGION}" >> $GITHUB_OUTPUT
        echo "AWS_STG_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}" >> $GITHUB_OUTPUT
```

### 設定値の説明

| 環境 | 設定項目 | 例 | 説明 |
|-----|---------|----|------|
| AWS_INSTANCE_ID | インスタンスID | i-07ca443c8a566e554 | EC2インスタンスID |
| AWS_REGION | リージョン | us-east-1 | AWSリージョン |
| AWS_ACCESS_KEY_ID | アクセスキーID | AKIAU72LF6A66T7M2HEJ | アクセスキーID |

## トラブルシューティング

### 一般的な問題と解決策

1. **デプロイに失敗する場合**
   - GitHub Secretsが正しく設定されているか確認
   - IAMユーザーに適切な権限が付与されているか確認
   - ワークフローログでエラーメッセージを確認

2. **アクセス権限エラー**
   - IAMポリシーが正しく設定されているか確認
   - リソース識別子（ARN）が正しいか確認
   - IAMユーザーのアクセスキーが有効か確認

3. **S3へのアップロードエラー**
   - S3バケット `multisender-deploy` が存在するか確認
   - デプロイパスが正しいか確認
   - バケットポリシーが正しく設定されているか確認

4. **SSMコマンド実行エラー**
   - EC2インスタンスが実行中であるか確認
   - SSMエージェントがインスタンスにインストールされているか確認
   - インスタンスのIAMロールにSSM接続権限があるか確認
   - インスタンスIDが正しいか確認

### EC2インスタンス側の問題解決

EC2インスタンス上でデプロイが失敗した場合、以下のログを確認してください：

1. SSMコマンド実行ログ
   - AWS Management Console > Systems Manager > Run Command > コマンド履歴

### ログの確認方法

1. GitHubリポジトリの「Actions」タブをクリック
2. 該当するワークフロー実行をクリック
3. 失敗したジョブをクリックして詳細を確認
4. 「デプロイ」ステップの出力を確認して具体的なエラーメッセージを特定

---

[戻る](../../)

[次へ](../run/)
