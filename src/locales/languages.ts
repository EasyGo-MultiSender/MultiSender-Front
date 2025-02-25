// 各言語の設定用インターフェース
export interface Language {
  code: string;
  label: string;
}

export const availableLanguages: Language[] = [
  { code: "en", label: "English" },
  { code: "ja", label: "日本語" },
];

export const defaultLanguage: string = "en";