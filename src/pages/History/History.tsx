import {
  Box,
  Card,
  Container,
  Typography,
  Divider,
  CardContent,
  CircularProgress,
} from '@mui/material';
import { History as HistoryIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { useWallet } from '../../hooks/useWallet';
import { getHistoryFiles } from '../../hooks/getHistoryFiles';
import WalletAddressDisplay from '../../components/WalletAddressDisplay';

const Logs = () => {
  const { t } = useTranslation();
  const { connected, walletInfo } = useWallet();
  const { files, loading, error } = getHistoryFiles(
    walletInfo?.address ?? null
  );

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
        {/* wallet未接続時に表示するカード */}
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
            <WalletAddressDisplay />
          </CardContent>
        </Card>

        {/* 履歴表示カード */}
        <Card sx={{ mb: 3, borderRadius: 2, overflow: 'hidden' }}>
          {/* 履歴表示カードのヘッダー */}
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

          {/* 履歴表示カードのコンテンツ */}
          <CardContent sx={{ py: 3 }}>
            {loading ? (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                py={4}
              >
                <CircularProgress />
              </Box>
            ) : error ? (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                flexDirection="column"
                py={4}
              >
                <Typography variant="body1" color="error" gutterBottom>
                  {error}
                </Typography>
              </Box>
            ) : files.length === 0 ? (
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
            ) : (
              <Box>
                {files.map((file, index) => (
                  <Box
                    key={index}
                    sx={{
                      p: 2,
                      '&:not(:last-child)': {
                        borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                      },
                    }}
                  >
                    <Typography variant="body1">{file}</Typography>
                  </Box>
                ))}
              </Box>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
};

export default Logs;
