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
import { useConnection } from '../../hooks/useConnection';
import WalletAddressDisplay from '../../components/WalletAddressDisplay';
import SerializerList from '../../components/SerializerList';
import { Serializer } from '../../types/transactionTypes';
import { useState, useEffect } from 'react';

const History = () => {
  const { t } = useTranslation();
  const { connected, walletInfo } = useWallet();
  const { connection } = useConnection();
  const { files, loading, error } = getHistoryFiles(
    walletInfo?.address ?? null
  );
  const [serializers, setSerializers] = useState<Serializer[]>([]);

  // ファイルリストからSerializerデータを生成
  useEffect(() => {
    if (files.length > 0) {
      // ダミーデータを作成（実際のアプリケーションでは、APIからデータを取得するなど）
      const dummySerializers: Serializer[] = files.map((file, index) => ({
        uuid: `serializer-${index}`,
        results: [
          {
            signature: `sig-${index}`,
            status: 'success',
            timestamp: Date.now() - index * 86400000, // 1日ずつ過去の日付
            recipients: [
              {
                address: `recipient-${index}`,
                amount: 0.1 + index * 0.05,
              },
            ],
            totalAmount: 0.1 + index * 0.05,
            token: 'SOL',
          },
        ],
      }));
      setSerializers(dummySerializers);
    } else {
      setSerializers([]);
    }
  }, [files]);

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
            ) : serializers.length === 0 ? (
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
      </Container>
    </Box>
  );
};

export default History;
