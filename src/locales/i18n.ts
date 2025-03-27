import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { availableLanguages, defaultLanguage } from './languages';

// JSON ファイルを動的に読み込む（eager: true で即時読み込み）
const modules = import.meta.glob('./*.json', { eager: true }) as Record<
  string,
  { default: any }
>;

// languages.ts で定義した各言語のリソースオブジェクトを作成
const resources = availableLanguages.reduce(
  (acc, lang) => {
    // ファイルパスは "./ja.json" のようになっている前提
    const resourceModule = modules[`./${lang.code}.json`];
    if (resourceModule) {
      acc[lang.code] = { translation: resourceModule.default };
    }
    return acc;
  },
  {} as Record<string, { translation: any }>
);

const savedLanguage = localStorage.getItem('language') || defaultLanguage;

i18n.use(initReactI18next).init({
  debug: false,
  resources,
  lng: savedLanguage,
  fallbackLng: defaultLanguage,
  returnEmptyString: false,
  interpolation: {
    escapeValue: false,
    prefix: '%',
    suffix: '%',
  },
});

export default i18n;
