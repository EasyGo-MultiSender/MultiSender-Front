// src/components/NetworkSelector.tsx
import { useState } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { clusterApiUrl } from '@solana/web3.js';
import {
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  TextField,
} from '@mui/material';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';
import COLORS from '@/constants/color';
import { t } from 'i18next';

export const NetworkSelector = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [customRpcDialogOpen, setCustomRpcDialogOpen] = useState(false);
  const [customRpc, setCustomRpc] = useState('');

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleNetworkChange = (network: WalletAdapterNetwork) => {
    let endpoint;
    if (network === WalletAdapterNetwork.Mainnet) {
      endpoint = import.meta.env.VITE_RPC_ENDPOINT;
    } else if (network === WalletAdapterNetwork.Devnet) {
      endpoint = import.meta.env.VITE_SOLANA_DEV_RPC_ENDPOINT;
    } else {
      endpoint = clusterApiUrl(network);
    }

    window.localStorage.setItem('network', network);
    window.localStorage.setItem('endpoint', endpoint);
    window.location.reload();
    handleClose();
  };

  const handleCustomRpcSubmit = () => {
    if (customRpc) {
      window.localStorage.setItem('network', 'custom');
      window.localStorage.setItem('endpoint', customRpc);
      window.location.reload();
    }
    setCustomRpcDialogOpen(false);
    handleClose();
  };

  // Get current network with proper default from env variables
  const currentNetwork =
    window.localStorage.getItem('network') ||
    import.meta.env.VITE_SOLANA_NETWORK ||
    import.meta.env.VITE_SOLANA_DEV_NETWORK ||
    'devnet';

  const getDisplayNetwork = () => {
    if (currentNetwork === 'custom') return 'Custom RPC';
    if (currentNetwork === WalletAdapterNetwork.Mainnet) return 'Mainnet Beta';
    if (currentNetwork === WalletAdapterNetwork.Devnet) return 'Devnet';
    return currentNetwork;
  };

  return (
    <>
      <Button
        onClick={handleClick}
        startIcon={
          <NetworkCheckIcon
            sx={{
              marginRight: '2px',
              marginLeft: '12px',
              fontSize: '1.4rem !important',
            }}
          />
        }
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: '0px',
          gap: '6px',

          width: '170px',
          height: '36px',

          background: COLORS.GRADIENTS.BLUE_TO_TEAL,
          borderRadius: '8px',

          color: COLORS.GRAY.LIGHT,
          fontWeight: 500,
          textTransform: 'none',
          fontSize: '0.9rem',

          '&:hover': {
            background: COLORS.GRADIENTS.BLUE_TO_TEAL,
            boxShadow: '0 4px 10px rgba(2, 215, 183, 0.4)',
          },
        }}
      >
        <Box
          sx={{
            textAlign: 'center',
            width: '105px',
          }}
        >
          {getDisplayNetwork()}
        </Box>
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        TransitionProps={{
          onExiting: (node) => {
            node.style.animation = 'dropdownFadeOut 0.2s ease';
          },
        }}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: COLORS.PURPLE.MEDIUM,
            color: COLORS.GRAY.LIGHT,
            borderRadius: '8px',
            minWidth: '160px',
            border: '0.05px solid #7867ea6a',
            padding: '0 8px',
            gap: '4px',
            marginTop: '8px',
            animation: 'dropdownFadeIn 0.2s ease',
            transformOrigin: 'top',
          },
          '& .MuiMenuItem-root': {
            fontSize: '1rem',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '4px',
            transition: 'background-color 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(3, 176, 228, 0.1)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(3, 176, 228, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(3, 176, 228, 0.3)',
              },
            },
          },
          '@keyframes dropdownFadeIn': {
            from: {
              opacity: 0,
              transform: 'scaleY(0.9)',
            },
            to: {
              opacity: 1,
              transform: 'scaleY(1)',
            },
          },
          '@keyframes dropdownFadeOut': {
            from: {
              opacity: 1,
              transform: 'scaleY(1)',
            },
            to: {
              opacity: 0,
              transform: 'scaleY(0.9)',
            },
          },
        }}
      >
        <MenuItem
          onClick={() => handleNetworkChange(WalletAdapterNetwork.Mainnet)}
          selected={currentNetwork === WalletAdapterNetwork.Mainnet}
        >
          Mainnet Beta
        </MenuItem>
        <MenuItem
          onClick={() => handleNetworkChange(WalletAdapterNetwork.Devnet)}
          selected={currentNetwork === WalletAdapterNetwork.Devnet}
        >
          Devnet
        </MenuItem>
        <MenuItem onClick={() => setCustomRpcDialogOpen(true)}>
          {t('Custom RPC')}
        </MenuItem>
      </Menu>

      <Dialog
        open={customRpcDialogOpen}
        onClose={() => setCustomRpcDialogOpen(false)}
      >
        <DialogTitle>{t('Enter Custom RPC URL')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="RPC URL"
            type="text"
            fullWidth
            variant="outlined"
            value={customRpc}
            onChange={(e) => setCustomRpc(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCustomRpcDialogOpen(false)}>
            {t('Cancel')}
          </Button>
          <Button onClick={handleCustomRpcSubmit}>{t('Submit')}</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
