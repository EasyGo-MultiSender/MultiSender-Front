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
import SerializerList from '../../components/SerializerList';
import WalletAddressDisplay from '../../components/WalletAddressDisplay';
import { getHistoryFiles } from '../../hooks/getHistoryFiles';
import { useConnection } from '../../hooks/useConnection';
import { useWallet } from '../../hooks/useWallet';

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
        height: 'calc(100vh - 8vh - 8vh)', // Subtract header (6vh) and footer (64px) heights
        bgcolor: '#2b2e45',
        position: 'relative',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Container maxWidth="md" sx={{ flex: 1 }}>
        {/* Card shown when wallet is not connected */}
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

        {/* Wallet address display card */}
        {connected && (
          <Card sx={{ my: 4, borderRadius: 2 }}>
            <CardContent>
              <WalletAddressDisplay />
            </CardContent>
          </Card>
        )}

        {/* History display card */}
        {connected && (
          <Card sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
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
                  {serializers.map((serializer) => (
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
