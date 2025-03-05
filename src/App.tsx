import { RouterProvider } from 'react-router-dom';
import { WalletConnectionProvider } from './providers/WalletProvider';
import { router } from './routes/router';
import './App.css';

function App() {
  return (
    <>
      <WalletConnectionProvider>
        <RouterProvider router={router} />
      </WalletConnectionProvider>
    </>
  );
}

export default App;
