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
  TextField,
} from '@mui/material';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

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
      endpoint = import.meta.env.VITE_RPC_ENDPOINT || clusterApiUrl(network);
    } else if (network === WalletAdapterNetwork.Devnet) {
      endpoint =
        import.meta.env.VITE_SOLANA_DEV_RPC_ENDPOINT || clusterApiUrl(network);
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
              fontSize: '1.4rem !important',
            }}
          />
        }
        sx={{
          display: 'flex',
          flexDirection: 'row',
          justifyContent: 'flex-start',
          alignItems: 'center',
          padding: '0 12px',
          gap: '6px',

          width: '160px',
          height: '36px',

          background: 'linear-gradient(90deg, #03B0E4 0%, #02D7B7 100%)',
          borderRadius: '8px',

          color: 'white',
          fontWeight: 600,
          textTransform: 'none',
          fontSize: '0.9rem',

          '&:hover': {
            background: 'linear-gradient(90deg, #039DC8 0%, #02C0A3 100%)',
            boxShadow: '0 4px 10px rgba(2, 215, 183, 0.4)',
          },
        }}
      >
        {getDisplayNetwork()}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: '#353859',
            color: 'white',
            borderRadius: '8px',
            minWidth: '160px',
          },
          '& .MuiMenuItem-root': {
            fontSize: '1rem',
            fontWeight: 500,
            padding: '8px 12px',
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
          Custom RPC
        </MenuItem>
      </Menu>

      <Dialog
        open={customRpcDialogOpen}
        onClose={() => setCustomRpcDialogOpen(false)}
      >
        <DialogTitle>Enter Custom RPC URL</DialogTitle>
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
          <Button onClick={() => setCustomRpcDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCustomRpcSubmit}>Submit</Button>
        </DialogActions>
      </Dialog>
    </>
  );
};
