import React, { useState } from 'react';
import Header from '../../components/Header';
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
} from '@mui/material';
import {
  History as HistoryIcon,
  FilterList as FilterIcon,
  GetApp as DownloadIcon,
  Refresh as RefreshIcon,
  ContentCopy,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '@solana/wallet-adapter-react';

const Logs = () => {
  const { t } = useTranslation();
  const { publicKey } = useWallet();
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  // アドレスコピー機能
  const copyAddress = async (addr: string) => {
    await navigator.clipboard.writeText(addr);
    setSnackbarMessage('Copied Address: ' + addr);
    setSnackbarOpen(true);
  };

  return (
    <Box>
      <Header />

      <Box
        sx={{
          pt: 0.01,
          mt: '12vh',
          height: '88vh',
          bgcolor: '#2b2e45',
          position: 'relative',
          overflowY: 'auto',
        }}
      >
        <Container maxWidth="md" sx={{ my: 4 }}>
          {/* ウォレットアドレス表示カード */}
          <Card sx={{ mb: 3, borderRadius: 2 }}>
            <CardContent>
              <Typography variant="h6" mb={1} textAlign="center">
                {t('Wallet Address')}
              </Typography>
              <Box
                sx={{
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  border: '1px solid #ccc',
                  borderRadius: 1,
                  p: 1,
                  height: 36,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{ flex: 1, textAlign: 'center' }}
                >
                  {publicKey?.toBase58() || t('Not connected')}
                </Typography>
                {publicKey && (
                  <IconButton
                    onClick={() =>
                      publicKey && copyAddress(publicKey.toBase58())
                    }
                    sx={{
                      position: 'absolute',
                      right: 8,
                      top: '50%',
                      transform: 'translateY(-50%)',
                    }}
                  >
                    <ContentCopy />
                  </IconButton>
                )}
              </Box>
            </CardContent>
          </Card>

          {/* 履歴表示カード */}
          <Card sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
            <Box
              sx={{
                bgcolor: '#4b5079',
                py: 3,
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

              <Box>
                <IconButton size="small" sx={{ color: '#fff', mr: 1 }}>
                  <RefreshIcon />
                </IconButton>

                <IconButton size="small" sx={{ color: '#fff', mr: 1 }}>
                  <FilterIcon />
                </IconButton>

                <IconButton size="small" sx={{ color: '#fff' }}>
                  <DownloadIcon />
                </IconButton>
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
                <Typography
                  variant="body2"
                  color="text.secondary"
                  align="center"
                  sx={{ maxWidth: 400, mb: 3 }}
                >
                  {t(
                    "Your token transfer history will appear here once you've made transactions"
                  )}
                </Typography>
                <Button variant="contained" color="primary" href="/sender">
                  {t('Make a Transfer')}
                </Button>
              </Box>
            </CardContent>
          </Card>
        </Container>
      </Box>

      {/* 通知用スナックバー */}
      <Snackbar
        open={snackbarOpen}
        autoHideDuration={3000}
        onClose={() => setSnackbarOpen(false)}
        message={snackbarMessage}
      />
    </Box>
  );
};

export default Logs;
