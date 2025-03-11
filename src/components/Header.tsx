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
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Stack,
  Avatar,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import AccountBalanceWalletIcon from '@mui/icons-material/AccountBalanceWallet';
import MenuIcon from '@mui/icons-material/Menu';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
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

  // Helper function to show a medium length wallet address (longer than shortAddress)
  const getMediumAddress = () => {
    if (!walletInfo?.address) return '';
    const address = walletInfo.address;
    // Show first 8 and last 8 characters
    return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
  };

  // Mobile drawer content
  const drawer = (
    <Box
      sx={{
        width: 280,
        backgroundColor: '#17062e',
        height: '100%',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Header section with app logo */}
      <Box
        sx={{
          p: 2,
          display: 'flex',
          alignItems: 'center',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
        }}
      >
        <RocketLaunchIcon
          sx={{ color: '#47dded', fontSize: '1.5rem', mr: 1.5 }}
        />
        <Typography variant="h6" sx={{ color: 'white', fontWeight: 600 }}>
          {t('easy go')}
        </Typography>
      </Box>

      {/* Wallet info section (if connected) */}
      {connected && walletInfo && (
        <Box
          sx={{
            p: 2,
            backgroundColor: 'rgba(120, 193, 253, 0.1)',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Avatar
            sx={{
              bgcolor: '#78c1fd',
              width: 32,
              height: 32,
              mr: 1.5,
            }}
          >
            <img
              src={wallet?.adapter?.icon}
              alt={`${wallet?.adapter?.name || 'Wallet'} icon`}
              style={{ width: '100%', height: '100%' }}
            />
          </Avatar>
          <Box>
            <Typography
              variant="body2"
              sx={{ color: '#aaa', fontSize: '0.7rem' }}
            >
              {t('Connected Wallet')}
            </Typography>
            <Typography
              sx={{ color: 'white', fontWeight: 500, fontSize: '0.9rem' }}
            >
              {getMediumAddress()}
            </Typography>
          </Box>
        </Box>
      )}

      {/* Navigation section */}
      <Typography
        variant="subtitle2"
        sx={{ px: 2, pt: 2, pb: 1, color: '#aaa', fontSize: '0.75rem' }}
      >
        {t('NAVIGATION')}
      </Typography>

      <List sx={{ px: 1 }}>
        <ListItemButton
          component={Link}
          to="/sender"
          onClick={handleDrawerToggle}
          selected={navValue === 'Multi Sender'}
          sx={{
            borderRadius: '8px',
            mb: 1,
            '&.Mui-selected': {
              backgroundColor: 'rgba(71, 221, 237, 0.1)',
            },
            '&:hover': {
              backgroundColor: 'rgba(71, 221, 237, 0.05)',
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: navValue === 'Multi Sender' ? '#47dded' : '#aaa',
              minWidth: 40,
            }}
          >
            <SendIcon />
          </ListItemIcon>
          <ListItemText
            primary={t('Multi Sender')}
            primaryTypographyProps={{
              color: navValue === 'Multi Sender' ? '#47dded' : 'white',
              fontSize: '0.9rem',
            }}
          />
        </ListItemButton>

        <ListItemButton
          component={Link}
          to="/history"
          onClick={handleDrawerToggle}
          selected={navValue === 'History'}
          sx={{
            borderRadius: '8px',
            '&.Mui-selected': {
              backgroundColor: 'rgba(71, 221, 237, 0.1)',
            },
            '&:hover': {
              backgroundColor: 'rgba(71, 221, 237, 0.05)',
            },
          }}
        >
          <ListItemIcon
            sx={{
              color: navValue === 'History' ? '#47dded' : '#aaa',
              minWidth: 40,
            }}
          >
            <HistoryIcon />
          </ListItemIcon>
          <ListItemText
            primary={t('History')}
            primaryTypographyProps={{
              color: navValue === 'History' ? '#47dded' : 'white',
              fontSize: '0.9rem',
            }}
          />
        </ListItemButton>
      </List>

      <Divider sx={{ my: 2, backgroundColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Settings section */}
      <Typography
        variant="subtitle2"
        sx={{ px: 2, pb: 1, color: '#aaa', fontSize: '0.75rem' }}
      >
        {t('SETTINGS')}
      </Typography>

      <Box sx={{ px: 2 }}>
        <Stack spacing={2}>
          <Box>
            <Typography
              variant="body2"
              sx={{ mb: 0.5, color: 'white', fontSize: '0.85rem' }}
            >
              {t('Language')}
            </Typography>
            <TranslateSelector />
          </Box>

          <Box>
            <Typography
              variant="body2"
              sx={{ mb: 0.5, color: 'white', fontSize: '0.85rem' }}
            >
              {t('Network')}
            </Typography>
            <NetworkSelector />
          </Box>
        </Stack>
      </Box>

      <Box sx={{ flexGrow: 1 }} />

      {/* Footer section */}
      <Box sx={{ p: 2, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
        <Typography
          variant="caption"
          sx={{ color: '#aaa', display: 'block', textAlign: 'center', mb: 1 }}
        >
          &copy; {new Date().getFullYear()} Easy Go -{' '}
          {t('Multi Sender for Solana')}
        </Typography>
      </Box>
    </Box>
  );

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
            {t('easy go')}
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
                    height: '36px',
                    padding: '0px 15px',
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

      {/* Mobile menu drawer */}
      <Drawer
        variant="temporary"
        open={isMobile && mobileMenuOpen}
        onClose={handleDrawerToggle}
        anchor="right"
        ModalProps={{
          keepMounted: true,
        }}
        sx={{
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: 280,
            backgroundColor: '#17062e',
          },
        }}
      >
        {drawer}
      </Drawer>
    </Box>
  );
});

export default Header;
