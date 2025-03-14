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
  useMediaQuery,
  useTheme,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MenuIcon from '@mui/icons-material/Menu';
import { Link } from 'react-router-dom';
import { memo, useEffect, useState } from 'react';
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useWallet } from '../hooks/useWallet';
import { NetworkSelector } from './NetworkSelector';
import { useTranslation } from 'react-i18next';
import TranslateSelector from './TranslateSelector';
import HeaderDrawer from './HeaderDrawer';

const Header = memo(() => {
  const { t } = useTranslation(); // 翻訳フック
  const [navValue, setNavValue] = useState<string | false>(false);
  const { connected, connecting, walletInfo, wallet } = useWallet();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleDrawerToggle = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  useEffect(() => {
    if (location.pathname.includes('/sender')) {
      setNavValue('Multi Sender');
    } else if (location.pathname.includes('/history')) {
      setNavValue('History');
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
          {!isMobile && <AccountBalanceWalletIcon sx={{ mr: 1 }} />}
          {!isMobile ? 'Connect Wallet' : 'Connect'}
        </>
      );
    }
    if (connecting) {
      return (
        <>
          <CircularProgress
            size={isMobile ? 16 : 20}
            sx={{ mr: isMobile ? 0 : 1 }}
          />
          {!isMobile ? 'Connecting...' : ''}
        </>
      );
    }

    if (connected) {
      // On mobile, just show a very short version of the address or nothing
      return <>{isMobile ? '' : walletInfo?.shortAddress}</>;
    }
  };

  return (
    <Box>
      <AppBar
        position="fixed"
        sx={{ backgroundColor: '#17062e', height: '8vh' }}
      >
        <Toolbar sx={{ minHeight: '8vh !important' }}>
          <IconButton
            edge="start"
            color="inherit"
            aria-label="logo"
            component={Link}
            to="/"
            sx={{ padding: '4px' }}
          >
            <RocketLaunchIcon
              sx={{ color: '#47dded', fontSize: '1.2rem', ml: 1 }}
            />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              marginLeft: 2,
              fontSize: isMobile ? '1.5rem' : '1.2rem',
            }}
          >
            <img src="/title.png" alt="logo" style={{ width: '100px' }} />
          </Typography>

          {!isMobile && (
            <Tabs
              value={navValue}
              onChange={navHandleChange}
              textColor="inherit"
              indicatorColor="secondary"
              aria-label="navigation tabs"
              sx={{
                position: 'absolute',
                left: '50%',
                transform: 'translateX(-50%)',
                minHeight: '6vh',
                '& .MuiTabs-indicator': {
                  backgroundColor: '#47dded',
                  transition: 'none',
                },
                '& .Mui-selected': { color: '#47dded' },
                '& .MuiTab-root': {
                  minHeight: '6vh',
                  padding: '0 16px',
                  fontSize: '1rem',
                },
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
                sx={{
                  fontSize: '0.8rem !important',
                }}
              />
              <Tab
                disableRipple
                value="History"
                label="History"
                component={Link}
                to="/history"
                sx={{
                  fontSize: '0.8rem !important',
                }}
              />
            </Tabs>
          )}

          {!isMobile && (
            <>
              <TranslateSelector />
              <Box sx={{ mx: 1 }}>
                <NetworkSelector />
              </Box>
            </>
          )}

          {/* Wallet button - completely redesigned for mobile */}
          <WalletMultiButton
            style={{
              backgroundColor: '#78c1fd',
              color: '#06234e',
              transition: 'all 0.2s ease',
              fontSize: '16px',
              // 共通のスタイル

              // 条件に基づいてスタイルをまとめて適用
              ...(isMobile
                ? {
                    // モバイル用スタイル
                    width: '40px',
                    height: '40px',
                    padding: 0,
                    display: 'grid',
                    placeItems: 'center',
                    marginRight: '10px',
                  }
                : {
                    // デスクトップ用スタイル
                    height: '32px',
                    padding: '0px 10px',
                    display: 'flex',
                    fontSize: '16px',
                    alignItems: 'center',
                    gap: connected ? '0px' : '8px',
                  }),
            }}
          >
            {getWalletButtonContent()}
          </WalletMultiButton>

          {/* Hamburger menu on the right side */}
          {isMobile && (
            <IconButton
              edge="end"
              color="inherit"
              aria-label="menu"
              onClick={handleDrawerToggle}
              sx={{
                width: '48px', // アイコンボタンの幅を大きくする
                height: '48px', // アイコンボタンの高さを大きくする
              }}
            >
              <MenuIcon
                sx={{
                  color: 'white',
                  fontSize: '32px', // アイコンのサイズを大きくする
                }}
              />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>

      {/* Mobile menu drawer - HeaderDrawerコンポーネントに変更 */}
      <HeaderDrawer
        open={isMobile && mobileMenuOpen}
        onClose={handleDrawerToggle}
        connected={connected}
        walletInfo={walletInfo}
        wallet={wallet}
        navValue={navValue}
      />
    </Box>
  );
});

export default Header;
