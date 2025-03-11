import React, { useState } from 'react';
import {
  Box,
  Card,
  Container,
  Typography,
  Divider,
  CardContent,
  IconButton,
  Button,
  Snackbar,
  useTheme,
  useMediaQuery,
} from '@mui/material';
import {
  History as HistoryIcon,
  FilterList as FilterIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  ContentCopy,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../hooks/useWallet';
import WalletAddressDisplay from '../../components/WalletAddressDisplay';

const Logs = () => {
  const { t } = useTranslation();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const { publicKey, connected } = useWallet();
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm')); // 600px未満だとtrue

  // アドレスコピー機能
  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setSnackbarMessage('Copied Address: ' + addr);
    setSnackbarOpen(true);
  };

  const formatAddress = (address: string) => {
    if (isMobile) {
      return `${address.slice(0, 13)}...${address.slice(-13)}`;
    }
    return address;
  };

  return (
    <Box
      sx={{
        height: 'calc(100vh - 8vh - 8vh)', // ヘッダー(6vh)とフッター(64px)の高さを引く
        bgcolor: '#2b2e45',
        position: 'relative',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Container maxWidth="md" sx={{ flex: 1 }}>
        {!connected && (
          <Card sx={{ mt: 2, p: 3, borderRadius: 2, bgcolor: '#ffffff' }}>
            <Typography
              variant="h4"
              sx={{
                textAlign: 'center',
                fontWeight: 'bold',
                color: '#000000',
              }}
            >
              {t('Please connect your wallet in the header')}
            </Typography>
          </Card>
        )}
        {/* ウォレットアドレス表示カード */}
        <Card sx={{ my: 4, borderRadius: 2 }}>
          <CardContent>
            <WalletAddressDisplay
              connected={connected}
              publicKey={publicKey}
              copyAddress={copyAddress}
              formatAddress={formatAddress}
            />
          </CardContent>
        </Card>

        {/* 履歴表示カード */}
        <Card sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
          <Box
            sx={{
              bgcolor: '#4b5079',
              py: 2.5,
              px: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box display="flex" alignItems="center">
              <HistoryIcon sx={{ fontSize: 28, color: '#fff', mr: 2 }} />
              <Typography variant="h5" fontWeight="bold" color="#fff">
                {t('Token Transfer History')}
              </Typography>
            </Box>
          </Box>

          <Divider />

          <CardContent sx={{ py: 3 }}>
            <Box
              display="flex"
              alignItems="center"
              justifyContent="center"
              flexDirection="column"
              py={4}
            >
              <HistoryIcon sx={{ fontSize: 48, color: '#aaa', mb: 2 }} />
              <Typography variant="body1" color="text.secondary" gutterBottom>
                {t('No transaction history found')}
              </Typography>
            </Box>
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Logs;
