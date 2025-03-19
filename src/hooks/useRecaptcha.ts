import { useState, useCallback } from 'react';

// グローバルに型定義を追加
declare global {
  interface Window {
    grecaptcha: {
      ready: (callback: () => void) => void;
      execute: (
        siteKey: string,
        options: { action: string }
      ) => Promise<string>;
    };
  }
}

/**
 * reCAPTCHA v3を使用するためのカスタムフック
 * @returns reCAPTCHAトークンを取得するための関数とローディング状態
 */
export const useRecaptcha = () => {
  const [loading, setLoading] = useState(false);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  /**
   * 指定されたアクションに対するreCAPTCHAトークンを取得する
   * @param action reCAPTCHAアクション名（例: 'submit', 'login'など）
   * @returns reCAPTCHAトークン
   */
  const getRecaptchaToken = useCallback(
    async (action: string): Promise<string> => {
      setLoading(true);
      try {
        return new Promise<string>((resolve, reject) => {
          window.grecaptcha.ready(async () => {
            try {
              const token = await window.grecaptcha.execute(siteKey, {
                action,
              });
              resolve(token);
            } catch (error) {
              console.error('reCAPTCHA error:', error);
              reject(error);
            } finally {
              setLoading(false);
            }
          });
        });
      } catch (error) {
        setLoading(false);
        console.error('reCAPTCHA initialization error:', error);
        throw error;
      }
    },
    []
  );

  return { getRecaptchaToken, loading };
};
