import { History as HistoryIcon } from '@mui/icons-material';
import {
  Box,
  Card,
  Container,
  Typography,
  Divider,
  CardContent,
  CircularProgress,
  Alert,
} from '@mui/material';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SerializerList from '@/components/SerializerList';
import WalletAddressDisplay from '@/components/WalletAddressDisplay';
import { getHistoryFiles } from '@/hooks/getHistoryFiles';
import { useConnection } from '@/hooks/useConnection';
import { useWallet } from '@/hooks/useWallet';
import { Serializer } from '@/types/transactionTypes';

const History = () => {
  const { t } = useTranslation();
  const { connected, walletInfo } = useWallet();
  const { connection } = useConnection();
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Get file list and Serializer data for the wallet address
  const { serializers, loading, error } = getHistoryFiles(
    walletInfo?.address ?? null
  );

  useEffect(() => {
    // Set initial load to false after first load
    if (!loading && isInitialLoad) {
      setIsInitialLoad(false);
    }
  }, [loading, isInitialLoad]);

  return (
    <Box
      sx={{
        height: 'calc(100vh - 8vh - 8vh)', // ヘッダー(6vh)とフッター(8vh)引く
        backgroundImage: `url("/bg.webp")`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        overflowY: 'auto',
      }}
    >
      <Container maxWidth="md" sx={{ flex: 1 }}>
        {/* Wallet address display card */}
        {connected && (
          <Card sx={{ my: 4 }}>
            <CardContent>
              <WalletAddressDisplay />
            </CardContent>
          </Card>
        )}

        {/* History display card */}
        {connected && (
          <Card sx={{ mb: 3, overflow: 'hidden' }}>
            {/* History card header */}
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

            {/* History card content */}
            <CardContent sx={{ py: 3 }}>
              {loading && (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  py={4}
                >
                  <CircularProgress />
                </Box>
              )}

              {error && !loading && (
                <Box
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  flexDirection="column"
                  py={4}
                >
                  <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                    {error}
                  </Alert>
                  <Typography variant="body2" color="text.secondary">
                    {t(
                      'Could not load transaction history. Please try again later.'
                    )}
                  </Typography>
                </Box>
              )}

              {!loading &&
                !error &&
                serializers.length === 0 &&
                !isInitialLoad && (
                  <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    flexDirection="column"
                    py={4}
                  >
                    <HistoryIcon sx={{ fontSize: 48, color: '#aaa', mb: 2 }} />
                    <Typography
                      variant="body1"
                      color="text.secondary"
                      gutterBottom
                    >
                      {t('No transaction history found')}
                    </Typography>
                  </Box>
                )}

              {!loading && !error && serializers.length > 0 && (
                <Box>
                  {serializers.map((serializer: Serializer) => (
                    <SerializerList
                      key={serializer.uuid}
                      serializer={serializer}
                      connection={connection}
                    />
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        )}
      </Container>
    </Box>
  );
};

export default History;
