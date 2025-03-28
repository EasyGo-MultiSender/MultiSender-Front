# 多言語対応（i18n）機能ガイド

このドキュメントでは、BulkSender-Frontプロジェクトで実装している多言語対応（国際化・i18n）機能について詳しく解説します。開発者がアプリケーションの翻訳機能を理解し、効率的に管理できるようにするためのガイドです。

## 目次
- [使用ライブラリ](#使用ライブラリ)
- [プロジェクト構成](#プロジェクト構成)
- [基本的な使用方法](#基本的な使用方法)
- [翻訳キーの抽出](#翻訳キーの抽出)
- [新しい言語の追加方法](#新しい言語の追加方法)
- [翻訳のベストプラクティス](#翻訳のベストプラクティス)
- [よくある問題とトラブルシューティング](#よくある問題とトラブルシューティング)

## 使用ライブラリ

本プロジェクトでは、以下のライブラリを使用して多言語対応を実現しています：

- **i18next** / **react-i18next**：  
  Reactアプリケーションで多言語対応を実装するための主要ライブラリです。
  
- **i18next-extract (Babel プラグイン)**：  
  コンポーネント内の翻訳キーを自動抽出し、指定したJSONファイルに出力するツールです。

## プロジェクト構成

多言語対応機能に関連するファイルの構成は以下の通りです：

```
src/
├── locales/
│   ├── i18n.ts             # i18nextの初期化・設定
│   ├── languages.ts        # サポート言語の定義
│   ├── ja.json             # 日本語翻訳ファイル
│   └── en.json             # 英語翻訳ファイル
└── components/
    └── LanguageSwitcher.tsx # 言語切り替えコンポーネント
```

## 基本的な使用方法

### 1. コンポーネントでの翻訳フックの使用

```tsx
import { useTranslation } from 'react-i18next';

const MyComponent: React.FC = () => {
  const { t } = useTranslation(); // 翻訳フックを取得
  
  return (
    <div>
      <h1>{t('welcomeMessage')}</h1>
      <p>{t('description')}</p>
      
      {/* パラメータを含む翻訳 */}
      <p>{t('greeting', { name: 'John' })}</p>
      
      {/* 複数形対応 */}
      <p>{t('itemCount', { count: 5 })}</p>
    </div>
  );
};
```

### 2. 言語の切り替え方法

```tsx
import { useTranslation } from 'react-i18next';

const LanguageSwitcher: React.FC = () => {
  const { i18n } = useTranslation();
  
  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('language', lng); // 選択した言語を保存
  };
  
  return (
    <div>
      <button onClick={() => changeLanguage('ja')}>日本語</button>
      <button onClick={() => changeLanguage('en')}>English</button>
    </div>
  );
};
```

## 翻訳キーの抽出

翻訳キーをコンポーネントから自動抽出するには、以下のコマンドを実行します：

```bash
npm run i18next-extract
```

このコマンドは、`src/locales/ja.json`と`src/locales/en.json`に翻訳キーを自動的に追加します。

**注意**：英語版（en.json）は値が空の場合、キー自体がそのまま表示されます。そのため、翻訳キーを英語で記述しておけば、en.jsonを編集する必要はありません。

## 新しい言語の追加方法

1. `src/locales/languages.ts`ファイルに新しい言語を追加します：

```typescript
export const availableLanguages = [
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'fr', name: 'Français' }, // 新しい言語を追加
];

export const defaultLanguage = 'en';
```

2. `babel.config.json`ファイルに新しい言語を追加して、キーの自動生成時に新言語用のファイルも作成されるようにします：

```json
{
  "plugins": [
    ["i18next-extract", {
      "locales": ["en", "ja", "fr"],
      "outputPath": "src/locales/{{locale}}.json"
    }]
  ]
}
```

3. 新しい言語ファイル（例：`fr.json`）を作成し、翻訳を追加します。

## 翻訳のベストプラクティス

1. **キーの命名規則**：
   - 一貫した命名規則を使用する（例：camelCase）
   - 関連するキーはプレフィックスでグループ化する（例：`userProfile.name`）

2. **構造化されたキー**：
   - ネストされたオブジェクトを使用して、関連する翻訳をグループ化する
   ```json
   {
     "common": {
       "ok": "OK",
       "cancel": "キャンセル"
     },
     "userProfile": {
       "title": "ユーザープロファイル",
       "name": "名前"
     }
   }
   ```

3. **変数の使用**：
   - 動的な値には変数パラメータを使用する
   ```jsx
   // 翻訳ファイル内
   "welcome": "こんにちは、%name%さん！"
   
   // コンポーネント内
   t('welcome', { name: userName })
   ```

4. **翻訳キーの検証**：
   - 未翻訳のキーを定期的にチェックする
   - 使用されていない翻訳キーを削除する

## よくある問題とトラブルシューティング

### 問題1: 翻訳が表示されない
- 翻訳キーが正しく定義されているか確認する
- i18nextの初期化が正しく行われているか確認する
- ブラウザのコンソールでエラーを確認する

### 問題2: 変数が正しく置換されない
- 変数名が正しいか確認する
- 插入フォーマット（`%variable%`）が正しいか確認する

### 問題3: 言語切り替えが機能しない
- `i18n.changeLanguage()`が正しく呼び出されているか確認する
- Reactコンポーネントが再レンダリングされているか確認する

---

翻訳機能の実装や管理について質問がある場合は、開発チームにお問い合わせください。
