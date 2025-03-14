import { useEffect } from 'react';
import { RouterProvider } from 'react-router-dom';
import { hideSplashScreen } from 'vite-plugin-splash-screen/runtime';
import { WalletConnectionProvider } from './providers/WalletProvider';
import { router } from './routes/router';
import './App.css';

function App() {
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

  return (
    <>
      <WalletConnectionProvider>
        <RouterProvider router={router} />
      </WalletConnectionProvider>
    </>
  );
}

export default App;
