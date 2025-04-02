import { ReactNode, useEffect } from 'react';
import ReactGA from 'react-ga4';
import { useLocation } from 'react-router-dom';

interface AnalyticsProviderProps {
  children: ReactNode;
  measurementId: string;
  isEnabled: boolean;
}

// Analytics初期化用のコンポーネント
export const AnalyticsProvider = ({
  children,
  measurementId,
  isEnabled,
}: AnalyticsProviderProps) => {
  useEffect(() => {
    if (isEnabled && measurementId) {
      ReactGA.initialize(measurementId);
    }
  }, [measurementId, isEnabled]);

  return <>{children}</>;
};

// ページビューのトラッキング用のコンポーネント
export const PageTrackingComponent = ({
  isEnabled,
}: {
  isEnabled: boolean;
}) => {
  const location = useLocation();

  useEffect(() => {
    if (isEnabled) {
      const path = location.pathname + location.search;
      ReactGA.send({ hitType: 'pageview', page: path });
    }
  }, [isEnabled, location]);

  return null;
};

// カスタムイベントトラッキング用の関数
export const trackEvent = (
  category: string,
  action: string,
  label?: string,
  value?: number
) => {
  if (import.meta.env.VITE_GA_MEASUREMENT === 'true') {
    ReactGA.event({
      category,
      action,
      label,
      value,
    });
  }
};

// エラートラッキング用の関数
export const trackError = (
  error: Error,
  componentName: string,
  additionalInfo?: Record<string, unknown>
) => {
  if (import.meta.env.VITE_GA_MEASUREMENT === 'true') {
    ReactGA.event({
      category: 'Error',
      action: error.name,
      label: `${componentName}: ${error.message}`,
      ...additionalInfo,
    });
  }
};
