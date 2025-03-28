import axios from 'axios';
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
 * reCAPTCHA検証結果の型定義
 */
export interface RecaptchaVerificationResult {
  success: boolean;
  token: string;
  error?: string;
}

/**
 * reCAPTCHA v3を使用するためのカスタムフック
 * @returns reCAPTCHAトークンを取得するための関数とローディング状態
 */
export const useRecaptcha = () => {
  const [loading, setLoading] = useState(false);
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;

  /**
   * 指定されたアクションに対するreCAPTCHAトークンを取得し、バックエンドで検証する
   * @param action reCAPTCHAアクション名（例: 'submit', 'login'など）
   * @returns 検証結果とトークン
   */
  const getRecaptchaToken = useCallback(
    async (action: string): Promise<RecaptchaVerificationResult> => {
      setLoading(true);
      try {
        return new Promise<RecaptchaVerificationResult>((resolve, reject) => {
          window.grecaptcha.ready(async () => {
            try {
              // Google reCAPTCHA APIからトークンを取得
              const token = await window.grecaptcha.execute(siteKey, {
                action,
              });

              // バックエンドURLを環境変数から取得
              const hostURL =
                import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

              // バックエンドにトークンを送信して検証
              const response = await axios.post(
                `${hostURL}/api/recaptcha/verify`,
                {
                  token: token,
                  action: action,
                }
              );

              // バックエンドからの応答をチェック
              if (response.data && response.status === 200) {
                // 検証が成功した場合
                resolve({
                  success: response.data.success,
                  token: token,
                });
              } else {
                // APIからの応答があるがエラーの場合
                reject({
                  success: false,
                  error: 'reCAPTCHA verification failed',
                  token: token,
                });
              }
            } catch (error) {
              console.error('reCAPTCHA error:', error);
              reject({
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                token: '',
              });
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
