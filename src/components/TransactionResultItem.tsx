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
          width: '100%',
          mb: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          bgcolor: 'rgba(0, 0, 0, 0.03)',
          borderRadius: 1,
          py: 1,
          mx: 'auto',
        }}
      >
        {result.recipients.length === 1 ? (
          <Typography variant="body2" mx={2}>
            {result.amount} {result.token} to {result.recipients[0].slice(0, 6)}
            ...
            {result.recipients[0].slice(-4)}
          </Typography>
        ) : (
          <Box width="100%">
            <Typography variant="body2" fontWeight="bold" mx={2}>
              Batch transfer: {result.recipients.length} recipients
            </Typography>
            <Typography variant="body2" color="primary" mb={1} mx={2}>
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
