import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';
import { PublicKey } from '@solana/web3.js';
import { memo } from 'react';

interface WalletAddressDisplayProps {
  connected: boolean;
  publicKey?: PublicKey | null;
  copyAddress: (address: string) => void;
  formatAddress: (address: string) => string;
}

const WalletAddressDisplay = memo(
  ({
    connected,
    publicKey,
    copyAddress,
    formatAddress,
  }: WalletAddressDisplayProps) => {
    const { t } = useTranslation();

    return (
      <>
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
            sx={{
              flex: 1,
              textAlign: 'center',
              color: !connected ? 'text.secondary' : 'inherit',
            }}
          >
            {connected
              ? formatAddress(publicKey?.toBase58() || '')
              : t('Please connect your wallet')}
          </Typography>
          {connected && (
            <Tooltip title="Copy" arrow placement="top">
              <IconButton
                onClick={() => publicKey && copyAddress(publicKey.toBase58())}
                sx={{
                  position: 'absolute',
                  right: 8,
                  top: '50%',
                  transform: 'translateY(-50%)',
                }}
              >
                <ContentCopy />
                <Typography
                  variant="caption"
                  sx={{
                    position: 'absolute',
                    bottom: -5.0,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    fontSize: '0.6rem',
                  }}
                >
                  copy
                </Typography>
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </>
    );
  }
);

export default WalletAddressDisplay;
