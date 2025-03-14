import {
  Box,
  Typography,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  Divider,
  Stack,
  Avatar,
  Drawer,
  useMediaQuery,
} from '@mui/material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CloseIcon from '@mui/icons-material/Close';
import HistoryIcon from '@mui/icons-material/History';
import SendIcon from '@mui/icons-material/Send';
import { Link } from 'react-router-dom';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import TranslateSelector from './TranslateSelector';
import { NetworkSelector } from './NetworkSelector';

interface HeaderDrawerProps {
  open: boolean;
  onClose: () => void;
  connected: boolean;
  walletInfo?: {
    address: string;
    shortAddress: string;
    name?: string;
  } | null;
  wallet?: {
    adapter?: {
      name?: string;
      icon?: string;
    };
  } | null;
  navValue: string | false;
}

const HeaderDrawer = memo(
  ({
    open,
    onClose,
    connected,
    walletInfo,
    wallet,
    navValue,
  }: HeaderDrawerProps) => {
    const { t } = useTranslation();
    const isMobile = useMediaQuery('(max-width:600px)');

    // Helper function to show a medium length wallet address (longer than shortAddress)
    const getMediumAddress = () => {
      if (!walletInfo?.address) return '';
      const address = walletInfo.address;
      // Show first 8 and last 8 characters
      return `${address.substring(0, 10)}...${address.substring(address.length - 10)}`;
    };

    // Drawer content
    const drawerContent = (
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
          <Typography
            variant="h6"
            sx={{
              flexGrow: 1,
              marginLeft: 2,
              fontSize: isMobile ? '1.5rem' : '1.2rem',
              display: 'flex',
              ml: 1,
              mt: 0.5,
            }}
          >
            <img src="/title.png" alt="logo" style={{ width: '100px' }} />
          </Typography>

          {/* 閉じるボタン */}
          <IconButton onClick={onClose} sx={{ ml: 'auto' }}>
            <CloseIcon sx={{ color: 'white', fontSize: '28px' }} />
          </IconButton>
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
            onClick={onClose}
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
            onClick={onClose}
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
      <Drawer
        variant="temporary"
        open={open}
        onClose={onClose}
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
        {drawerContent}
      </Drawer>
    );
  }
);

export default HeaderDrawer;
