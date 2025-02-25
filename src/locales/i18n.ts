import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import jaJson from "./ja.json";
import enJson from "./en.json";

const savedLanguage = localStorage.getItem("language") || " en";

i18n.use(initReactI18next).init({
  debug: true,
  resources: {
    en: { translation: enJson },
    ja: { translation: jaJson },
  },
  lng: savedLanguage,
  fallbackLng: "en",
  returnEmptyString: false,
  interpolation: { escapeValue: false },
});

export default i18n; // ✅ これがないと `i18n.changeLanguage` が使えない
