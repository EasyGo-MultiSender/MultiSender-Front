import { ContentCopy } from '@mui/icons-material';
import {
  Box,
  Typography,
  IconButton,
  Tooltip,
  useMediaQuery,
} from '@mui/material';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import COLORS from '@/constants/color';
import { useWallet } from '@/hooks/useWallet';
import { handleCopy } from '@/hooks/util/copy';
const WalletAddressDisplay = memo(() => {
  const { t } = useTranslation();
  const [isCopied, setIsCopied] = useState(false);
  const { publicKey, connected } = useWallet();
  const isMobile = useMediaQuery('(max-width:600px)');

  const formatAddress = (address: string) => {
    if (isMobile) {
      return `${address.slice(0, 13)}...${address.slice(-13)}`;
    }
    return address;
  };

  return (
    <>
      <Typography variant="h6" mb={1} textAlign="center" fontWeight={600}>
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
          width: '95%',
          mx: 0,
          left: '50%',
          transform: 'translateX(-50%)',
        }}
      >
        <Typography
          variant="body2"
          sx={{
            flex: 1,
            textAlign: 'center',
            color: !connected ? COLORS.GRAY.LIGHT : 'inherit',
          }}
        >
          {connected
            ? formatAddress(publicKey?.toBase58() || '')
            : t('Please connect your wallet')}
        </Typography>
        {connected && (
          <Tooltip
            title={isCopied ? t('Copied !') : t('Copy Address')}
            arrow
            placement="top"
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                handleCopy(publicKey?.toBase58() || '', setIsCopied);
              }}
              sx={{
                display: 'flex',
                flexDirection: 'column',
                color: COLORS.PURPLE.LIGHT,
                width: 38,
                height: 38,
                padding: 0,
              }}
            >
              <ContentCopy
                fontSize="small"
                sx={{ mt: -0.5, color: COLORS.PURPLE.LIGHT }}
              />
              <Typography
                variant="caption"
                sx={{
                  position: 'absolute',
                  bottom: -1.0,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: '0.6rem',
                  color: COLORS.PURPLE.LIGHT,
                }}
              >
                {t('copy')}
              </Typography>
            </IconButton>
          </Tooltip>
        )}
      </Box>
    </>
  );
});

export default WalletAddressDisplay;
