import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import fs from "fs";
import path from "path";

// 📌 翻訳データのファイルパスを修正
const JA_PATH = path.resolve(__dirname, "./ja.json"); // locales/ja.json
const EN_PATH = path.resolve(__dirname, "./en.json"); // locales/en.json

// 📌 既存の翻訳データを読み込む
const jaTranslations = JSON.parse(fs.readFileSync(JA_PATH, "utf-8"));
const enTranslations = JSON.parse(fs.readFileSync(EN_PATH, "utf-8"));

// 📌 未登録の翻訳キーを JSON に自動追加する関数
function autoRegisterKey(englishText: string): string {
  if (!enTranslations[englishText]) {
    console.warn(`⚠️ Warning: Key '${englishText}' not found in en.json`);
    return englishText; // `en.json` に存在しないキーは警告を出す
  }

  // `ja.json` に未登録なら追加（`[TODO]` をつける）
  if (!jaTranslations[englishText]) {
    jaTranslations[englishText] = `[TODO] ${englishText}`; // TODOとして自動追加
    fs.writeFileSync(JA_PATH, JSON.stringify(jaTranslations, null, 2), "utf-8");
  }

  return englishText;
}

// 📌 i18next の設定
i18n.use(initReactI18next).init({
  resources: {
    en: { translation: enTranslations }, // 英語
    ja: { translation: jaTranslations }, // 日本語
  },
  lng: "en", // デフォルトは英語
  fallbackLng: false,
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

export { autoRegisterKey };
export default i18n;
