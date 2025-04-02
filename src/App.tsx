import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { hideSplashScreen } from 'vite-plugin-splash-screen/runtime';
import { AnalyticsProvider, usePageTracking } from './providers/AnalyticsProvider';
import { WalletConnectionProvider } from './providers/WalletProvider';
import { router } from './routes/router';
import './App.css';

function App() {
  const isAnalyticsEnabled = import.meta.env.VITE_GA_MEASUREMENT === 'true';
  
  useEffect(() => {
    if (document.readyState === 'complete') {
      hideSplashScreen();
    } else {
      const handleLoad = () => {
        hideSplashScreen();
      };
      window.addEventListener('load', handleLoad);

      // クリーンアップ関数
      return () => {
        window.removeEventListener('load', handleLoad);
      };
    }
  }, []);

  // Google Analyticsのページトラッキングを実装
  usePageTracking(isAnalyticsEnabled);

  return (
    <>
      <WalletConnectionProvider>
        <AnalyticsProvider 
          measurementId={import.meta.env.VITE_GA_MEASUREMENT_ID}
          isEnabled={isAnalyticsEnabled}
        >
          <RouterProvider router={router} />
        </AnalyticsProvider>
      </WalletConnectionProvider>
    </>
  );
}

export default App;
