import { ReactNode, useEffect } from 'react';
import ReactGA from 'react-ga4';

interface AnalyticsProviderProps {
  children: ReactNode;
  measurementId: string;
  isEnabled: boolean;
}

export const AnalyticsProvider = ({ children, measurementId, isEnabled }: AnalyticsProviderProps) => {
  useEffect(() => {
    if (isEnabled && measurementId) {
      ReactGA.initialize(measurementId);
    }
  }, [measurementId, isEnabled]);

  return <>{children}</>;
};

// ページビューのトラッキング用のカスタムフック
export const usePageTracking = (isEnabled: boolean) => {
  useEffect(() => {
    if (isEnabled) {
      // 現在のURLを取得
      const path = window.location.pathname + window.location.search;
      ReactGA.send({ hitType: "pageview", page: path });
    }
  }, [isEnabled]);
}; 