import { Box, Chip, Typography, ListItem } from '@mui/material';

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
}

export const TransactionResultItem = ({
  result,
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
        <Typography
          component="a"
          href={`https://solscan.io/tx/${result.signature}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: 'primary.main',
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
            fontSize: '0.875rem',
            width: '100%',
            display: 'block',
            textAlign: 'left',
          }}
        >
          {`${result.signature.slice(0, 10)}...${result.signature.slice(-8)}`}
        </Typography>
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

      {/* Signature with Copy and Link */}
      <Box
        display="flex"
        alignItems="center"
        width="100%"
        sx={{ wordBreak: 'break-all' }}
      >
        {/* ... 既存のSignatureコード ... */}
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
