# 言語切り替え機能の使い方 & メモ

このドキュメントでは、当プロジェクトで実装している翻訳機能について、その設定方法、利用方法、そしてコマンドを解説します。

---

## 使用しているライブラリ

- **i18next** / **react-i18next**  
  翻訳のための主要ライブラリです。
- **i18next-extract (Babel プラグイン)**  
  コンポーネント内の翻訳キーを自動抽出し、指定した JSON ファイルに出力します。

---

## 使用方法

ライブラリをインポートして

```tsx
const { t } = useTranslation(); // 翻訳フック
```

言語切り替えに対応したい箇所を以下のように記述します

```tsx
            {t("AppName")}    
```

その後

```bash
    npm run i18next-extract
```

をすれば `src/locales/ja.json`と`src/locales/en.json` に翻訳キーが追加されます。
en.jsonは値が空の場合キーがそのまま表示されるので、英語で書いておけばen.jsonは編集しなくても大丈夫です。

## 言語を追加するとき

languages.ts　と、babel.config.json(キーの自動生成ファイル)に追加すればよい
