// src/components/Header.tsx
import { Buffer } from 'buffer';
window.Buffer = Buffer;

import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MenuIcon from '@mui/icons-material/Menu';
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
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { memo, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import HeaderDrawer from '@/components/HeaderDrawer';
import { NetworkSelector } from '@/components/NetworkSelector';
import TranslateSelector from '@/components/TranslateSelector';
import { COLORS } from '@/constants/color';
import { useWallet } from '@/hooks/useWallet';
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
          <AccountBalanceWalletIcon
            sx={{
              mx: 'auto',
              fontSize: isMobile ? '1.2rem' : '1.4rem',
            }}
          />
          {!isMobile && (
            <span style={{ whiteSpace: 'nowrap' }}>Connect Wallet</span>
          )}
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
          {!isMobile && (
            <span style={{ whiteSpace: 'nowrap' }}>Connecting...</span>
          )}
        </>
      );
    }

    if (connected) {
      return (
        <>
          {!isMobile && (
            <span style={{ whiteSpace: 'nowrap' }}>
              {walletInfo?.shortAddress}
            </span>
          )}
        </>
      );
    }
  };

  return (
    <Box>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: COLORS.PURPLE.DARK,
          height: '8vh',
          boxSizing: 'border-box',
        }}
      >
        <Toolbar
          sx={{
            minHeight: '8vh !important',
            padding: '0 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <IconButton
            edge="start"
            color="inherit"
            aria-label="logo"
            component={Link}
            to="/"
            sx={{ padding: '4px' }}
          >
            <img
              src="/symbolmark.svg"
              alt="logo"
              style={{ width: '1.6rem', marginLeft: '4px' }}
            />
          </IconButton>

          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              marginLeft: 2,
              fontSize: isMobile ? '1.5rem' : '1.2rem',
              display: 'flex',
            }}
          >
            <Link
              to="/sender"
              onClick={() => setNavValue('Multi Sender')}
              style={{ marginTop: '1rem' }}
            >
              <img src="/title.png" alt="logo" style={{ width: '100px' }} />
            </Link>
          </Typography>

          {!isMobile && (
            <Tabs
              value={navValue}
              onChange={navHandleChange}
              textColor="inherit"
              aria-label="navigation tabs"
              sx={{
                position: 'absolute',
                left: '42%',
                transform: 'translateX(-50%)',
                minHeight: '6vh',
                '& .MuiTabs-indicator': {
                  backgroundColor: '#47dded',
                  transition: 'none',
                },
                '& .MuiTab-root': {
                  minHeight: '6vh',
                  padding: '0',
                  paddingRight: '16px',
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
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <img
                      src="/icons/sender-active.svg"
                      alt="sender"
                      style={{
                        width: '1rem',
                        marginRight: '0.3rem',
                        filter:
                          navValue !== 'Multi Sender'
                            ? `brightness(0) saturate(100%) invert(77%) sepia(11%) saturate(396%) hue-rotate(202deg) brightness(98%) contrast(87%)`
                            : 'none',
                      }}
                    />
                    <span
                      style={{
                        color:
                          navValue === 'Multi Sender'
                            ? COLORS.BLUE.TURQUOISE
                            : COLORS.PURPLE.LIGHT,
                      }}
                    >
                      Multi Sender
                    </span>
                  </Box>
                }
                component={Link}
                to="/sender"
                sx={{
                  fontSize: '0.8rem !important',
                  marginRight: '4rem',
                }}
              />
              <Tab
                disableRipple
                value="History"
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <img
                      src={'/icons/history-active.svg'}
                      alt="history"
                      style={{
                        width: '1rem',
                        marginRight: '0.3rem',
                        filter:
                          navValue !== 'History'
                            ? `brightness(0) saturate(100%) invert(77%) sepia(11%) saturate(396%) hue-rotate(202deg) brightness(98%) contrast(87%)`
                            : 'none',
                      }}
                    />
                    <span
                      style={{
                        color:
                          navValue === 'History'
                            ? COLORS.BLUE.TURQUOISE
                            : COLORS.PURPLE.LIGHT,
                      }}
                    >
                      History
                    </span>
                  </Box>
                }
                component={Link}
                to="/history"
                sx={{
                  fontSize: '0.8rem !important',
                  marginRight: '2rem',
                }}
              />
            </Tabs>
          )}

          {!isMobile && (
            <>
              <TranslateSelector />
              <Box sx={{ mx: 2 }}>
                <NetworkSelector />
              </Box>
            </>
          )}

          {/* Wallet button - completely redesigned for mobile */}
          <WalletMultiButton
            style={{
              // スタイルをCSSに移動したので、ここでは最低限のものだけ残す
              marginRight: isMobile ? '10px' : '0',
              alignSelf: 'center',
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
