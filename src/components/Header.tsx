// src/components/Header.tsx
import { Buffer } from 'buffer';
window.Buffer = Buffer;

import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Tab,
  Tabs,
  CircularProgress,
  Box,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import { Link } from 'react-router-dom';
import { memo, useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '../hooks/useWallet';
import { NetworkSelector } from './NetworkSelector';
import { useTranslation } from 'react-i18next';
import TranslateSelector from './TranslateSelector';

const Header = memo(() => {
  const { t } = useTranslation(); // 翻訳フック
  const [navValue, setNavValue] = useState<string | false>(false);
  const { connected, connecting, walletInfo } = useWallet();

  useEffect(() => {
    if (location.pathname.includes('/sender')) {
      setNavValue('Multi Sender');
    } else if (location.pathname.includes('/Log')) {
      setNavValue('Log');
    } else {
      setNavValue('');
    }
  }, [location.pathname]);

  const navHandleChange = (_event: React.SyntheticEvent, newValue: string) => {
    setNavValue(newValue);
  };

  const getWalletButtonContent = () => {
    if (!connected && !connecting) {
      return (
        <>
          <AccountBalanceWalletIcon sx={{ mr: 1 }} />
          Connect Wallet
        </>
      );
    }
    if (connecting) {
      return (
        <>
          <CircularProgress size={20} sx={{ mr: 1 }} />
          Connecting...
        </>
      );
    }

    if (connected) {
      return <>{walletInfo?.shortAddress}</>;
    }
  };

  return (
    <Box>
      <AppBar
        position="fixed"
        sx={{ backgroundColor: '#17062e', height: '12vh' }}
      >
        <Toolbar>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="menu"
            component={Link}
            to="/"
          >
            <RocketLaunchIcon sx={{ color: '#47dded' }} />
          </IconButton>

          <Typography variant="h6" sx={{ flexGrow: 1, marginLeft: 2 }}>
            {t('easy go')}
          </Typography>

          <Tabs
            value={navValue}
            onChange={navHandleChange}
            textColor="inherit"
            indicatorColor="secondary"
            aria-label="secondary tabs example"
            sx={{
              position: 'absolute',
              left: '50%',
              transform: 'translateX(-50%)',
              '& .MuiTabs-indicator': {
                backgroundColor: '#47dded',
                transition: 'none',
              },
              '& .Mui-selected': { color: '#47dded' },
              '& .MuiTab-root:not(.Mui-selected):hover': {
                color: '#47dded',
                opacity: 0.7,
              },
            }}
          >
            <Tab
              disableRipple
              value="Multi Sender"
              label="Multi Sender"
              component={Link}
              to="/sender"
            />
            <Tab
              disableRipple
              value="Log"
              label="Log"
              component={Link}
              to="/log"
            />
          </Tabs>

          {/* Add NetworkSelector before WalletMultiButton */}
          <TranslateSelector />
          <Box sx={{ mx: 1 }}>
            <NetworkSelector />
          </Box>

          <WalletMultiButton
            style={{
              backgroundColor: '#78c1fd',
              color: '#06234e',
              transition: 'all 0.2s ease',
              padding: '8px 15px',
              fontSize: '16px',
              height: '42px',
              display: 'flex',
              alignItems: 'center',
              gap: connected ? '0px' : '8px',
            }}
          >
            {getWalletButtonContent()}
          </WalletMultiButton>
        </Toolbar>
      </AppBar>
    </Box>
  );
});

export default Header;
