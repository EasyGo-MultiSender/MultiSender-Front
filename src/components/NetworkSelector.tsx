// src/components/NetworkSelector.tsx
import { useState } from 'react';
import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import { useConnection } from '@solana/wallet-adapter-react';
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
  Box,
} from '@mui/material';
import NetworkCheckIcon from '@mui/icons-material/NetworkCheck';

export const NetworkSelector = () => {
  const { connection } = useConnection();
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
      endpoint = import.meta.env.VITE_SOLANA_DEV_RPC_ENDPOINT || clusterApiUrl(network);
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
  const currentNetwork = window.localStorage.getItem('network') || 
    import.meta.env.VITE_SOLANA_NETWORK || 
    import.meta.env.VITE_SOLANA_DEV_NETWORK || 
    'devnet';

  // Get current endpoint for display purposes
  const currentEndpoint = window.localStorage.getItem('endpoint') || 
    (currentNetwork === WalletAdapterNetwork.Mainnet ? import.meta.env.VITE_RPC_ENDPOINT : import.meta.env.VITE_SOLANA_DEV_RPC_ENDPOINT);

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
        startIcon={<NetworkCheckIcon />}
        sx={{
          color: '#47dded',
          marginRight: 2,
          '&:hover': {
            backgroundColor: 'rgba(71, 221, 237, 0.1)',
          },
        }}
      >
        {getDisplayNetwork()}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
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

      <Dialog open={customRpcDialogOpen} onClose={() => setCustomRpcDialogOpen(false)}>
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