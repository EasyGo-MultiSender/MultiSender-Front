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
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import SerializerList from '@/components/SerializerList';
import WalletAddressDisplay from '@/components/WalletAddressDisplay';
import COLORS from '@/constants/color';
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
        height: 'calc(100vh - 8vh - 8vh)', // ヘッダー(8vh)とフッター(8vh)引く
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
        <Card sx={{ my: 4 }}>
          <CardContent>
            {!connected ? (
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  height: '100%',
                  gap: 2,
                }}
              >
                <WalletMultiButton
                  style={{
                    width: '280px',
                    height: '36px',
                    padding: '0 12px',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    background: 'transparent',
                    borderRadius: '8px',
                  }}
                >
                  <span
                    style={{
                      whiteSpace: 'nowrap',
                      fontSize: '14px',
                      lineHeight: '36px',
                    }}
                  >
                    Please connect your wallet
                  </span>
                </WalletMultiButton>
              </Box>
            ) : (
              <WalletAddressDisplay />
            )}
          </CardContent>
        </Card>

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

      <style>
        {`
          .wallet-adapter-button img {
            width: 20px !important;
            height: 20px !important;
          }
          .wallet-adapter-button-trigger {
            background: ${COLORS.GRADIENTS.PURPLE_TO_LAVENDER} !important;
            padding: 0 !important;
            border-radius: 8px !important;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.15) !important;
            transition: all 0.2s ease !important;
          }
          .wallet-adapter-button-trigger:hover {
            opacity: 0.9 !important;
            transform: translateY(-1px) !important;
          }
          .wallet-adapter-dropdown {
            background-color: ${COLORS.PURPLE.MEDIUM} !important;
          }
          .wallet-adapter-dropdown-list {
            background-color: ${COLORS.PURPLE.MEDIUM} !important;
            color: ${COLORS.GRAY.LIGHT} !important;
            border-radius: 8px !important;
            border: 0.05px solid #7867ea6a !important;
            padding: 8px !important;
            gap: 4px !important;
          }
          .wallet-adapter-dropdown-list-item {
            font-size: 1rem !important;
            font-weight: 500 !important;
            padding: 8px 12px !important;
            border-radius: 4px !important;
            background-color: transparent !important;
            transition: all 0.1s ease !important;
          }
          .wallet-adapter-dropdown-list-item:hover {
            background-color: rgba(3, 176, 228, 0.1) !important;
          }
        `}
      </style>
    </Box>
  );
};

export default History;
