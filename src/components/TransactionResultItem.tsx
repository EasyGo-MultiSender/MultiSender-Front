import {
  Box,
  Chip,
  Typography,
  ListItem,
  ListItemText,
  IconButton,
  Link,
  Tooltip,
} from '@mui/material';
import { ContentCopy, OpenInNew } from '@mui/icons-material';

interface TransactionResultItemProps {
  result: {
    signature: string;
    status: string;
    timestamp: number;
    recipients: string[];
    amount: number;
    token: string;
    error?: string;
  };
  connection: {
    rpcEndpoint: string;
  };
  copyAddress: (address: string) => void;
}

export const TransactionResultItem = ({
  result,
  connection,
  copyAddress,
}: TransactionResultItemProps) => {
  return (
    <ListItem
      sx={{
        position: 'relative',
        bgcolor: '#f5f5f5',
        borderRadius: 1,
        mb: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
        p: 2,
      }}
    >
      {/* Status and Timestamp */}
      <Box display="flex" alignItems="center" width="100%" mb={1}>
        <Chip
          label={result.status}
          color={result.status === 'success' ? 'success' : 'error'}
          size="small"
          sx={{ mr: 1 }}
        />
        <Typography variant="caption" color="text.secondary">
          {new Date(result.timestamp).toLocaleString()}
        </Typography>
      </Box>

      {/* Signature with Copy and Link */}
      <Box
        display="flex"
        alignItems="center"
        width="100%"
        height={40}
        sx={{ wordBreak: 'break-all' }}
      >
        <ListItemText
          primary={
            <Link
              href={`https://solscan.io/tx/${result.signature}${
                connection.rpcEndpoint.includes('devnet')
                  ? '?cluster=devnet'
                  : ''
              }`}
              target="_blank"
              rel="noopener noreferrer"
              sx={{
                display: 'flex',
                alignItems: 'center',
                ml: 1,
                height: '100%',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '100%',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
              }}
            >
              {`${result.signature.slice(0, 15)}......${result.signature.slice(-15)}`}
              <Tooltip title="link" arrow placement="top">
                <Box
                  sx={{
                    position: 'relative',
                    ml: 1,
                    mt: 0.3,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                  }}
                >
                  <OpenInNew sx={{ fontSize: 16 }} />
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: '0.6rem',
                      whiteSpace: 'nowrap',
                      lineHeight: 1,
                      mt: 0,
                    }}
                  >
                    link
                  </Typography>
                </Box>
              </Tooltip>
            </Link>
          }
        />
        <Tooltip title="Copy" arrow placement="top">
          <Box
            sx={{
              ml: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                copyAddress(result.signature);
              }}
            >
              <ContentCopy fontSize="small" />
            </IconButton>
            <Typography
              variant="caption"
              sx={{
                fontSize: '0.6rem',
                whiteSpace: 'nowrap',
                lineHeight: 1,
                mt: -0.5,
              }}
            >
              copy
            </Typography>
          </Box>
        </Tooltip>
      </Box>

      {/* Transfer Information */}
      <Box
        sx={{
          width: '95%',
          mb: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.03)',
          borderRadius: 1,
          py: 1,
          px: 2,
          mx: 'auto',
        }}
      >
        {result.recipients.length === 1 ? (
          <Typography variant="body2">
            {result.amount} {result.token} to {result.recipients[0].slice(0, 6)}
            ...
            {result.recipients[0].slice(-4)}
          </Typography>
        ) : (
          <Box width="100%">
            <Typography variant="body2" fontWeight="bold">
              Batch transfer: {result.recipients.length} recipients
            </Typography>
            <Typography variant="body2" color="primary" mb={1}>
              Total: {(result.amount * result.recipients.length).toFixed(6)}{' '}
              {result.token}
            </Typography>
          </Box>
        )}
      </Box>

      {/* Error Message */}
      {result.error && (
        <Box
          sx={{
            mt: 1,
            width: '100%',
            backgroundColor: 'error.light',
            borderRadius: 1,
            p: 1,
          }}
        >
          <Typography variant="caption" color="error.dark">
            Error: {result.error}
          </Typography>
        </Box>
      )}
    </ListItem>
  );
};
