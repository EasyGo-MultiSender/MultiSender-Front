import {
  Box,
  Chip,
  Typography,
  ListItem,
  ListItemText,
  IconButton,
  Link,
  Tooltip,
  Button,
} from '@mui/material';
import { ContentCopy, OpenInNew } from '@mui/icons-material';

interface AddressEntry {
  address: string;
  amount: number;
}

interface TransactionResult {
  signature: string;
  status: 'success' | 'error';
  timestamp: number;
  error?: string;
  recipients: string[];
  amount: number;
  token: string;
}

interface TransactionResultItemProps {
  result: TransactionResult;
  recipientAddresses: AddressEntry[];
  connection: {
    rpcEndpoint: string;
  };
  copyAddress: (address: string) => void;
}

export const TransactionResultItem = ({
  result,
  recipientAddresses,
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
      {/* Status , Timestamp  and download button*/}
      <Box
        display="flex"
        alignItems="center"
        width="100%"
        mb={1}
        justifyContent="space-between"
      >
        <Box>
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
        <Tooltip title="Download" arrow placement="top">
          <Button
            variant="outlined"
            color="inherit"
            size="small"
            sx={{
              mr: 1,
              borderColor: 'rgba(27, 27, 27, 0.37)',
              backgroundColor: 'rgba(215, 217, 222, 0.43)',
              '&:hover': {
                backgroundColor: 'rgba(185, 187, 193, 0.43)',
                borderColor: 'rgba(0, 0, 0, 0.23)',
              },
            }}
          >
            Download
          </Button>
        </Tooltip>
      </Box>

      {/* Signature with Copy and Link */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          width: '97%',
          mb: 2,
          p: 1,
          mt: 1.5,
          backgroundColor: 'rgba(0, 0, 0, 0.065)',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        <Link
          href={`https://solscan.io/tx/${result.signature}${
            connection.rpcEndpoint.includes('devnet') ? '?cluster=devnet' : ''
          }`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            color: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            flex: 1,
            textDecoration: 'none',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          <Typography
            sx={{
              fontFamily: 'monospace',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {`${result.signature.slice(0, 20)}...${result.signature.slice(-20)}`}
          </Typography>
          <OpenInNew sx={{ fontSize: 20, ml: 1 }} />
        </Link>

        <Tooltip title="Copy Signature" arrow>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              copyAddress(result.signature);
            }}
          >
            <ContentCopy fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>

      {/* Transfer Information */}

      <Box
        sx={{
          width: '100%',
          mb: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: 1,
          py: 1,
          px: 1,
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
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                mb: 2,
                borderBottom: '1px solid rgba(0, 0, 0, 0.12)',
                pb: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Button
                  variant="text"
                  size="small"
                  startIcon={<ContentCopy fontSize="small" />}
                  onClick={() => {
                    const dataToCopy = recipientAddresses
                      .map(
                        (entry) =>
                          `${entry.address}, ${entry.amount} ${result.token}`
                      )
                      .join('\n');
                    navigator.clipboard.writeText(dataToCopy);
                    copyAddress('all-data');
                  }}
                  sx={{
                    fontSize: '0.75rem',
                    textTransform: 'none',
                    minWidth: 'auto',
                    p: '2px 8px',
                    color: 'text.secondary',
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)',
                    },
                  }}
                >
                  Copy All
                </Button>
              </Box>
            </Box>

            <Box
              sx={{
                maxHeight: '200px',
                overflowY: 'auto',
                width: '100%',
                boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
                borderRadius: '6px',
                paddingRight: '4px',
                '&::-webkit-scrollbar': {
                  width: '6px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(0, 0, 0, 0.05)',
                  borderRadius: '4px',
                  marginLeft: '4px',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '4px',
                  '&:hover': {
                    background: 'rgba(0, 0, 0, 0.3)',
                  },
                },
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  borderRadius: '6px',
                  overflow: 'hidden',
                }}
              >
                <thead>
                  <tr
                    style={{
                      background:
                        'linear-gradient(180deg, rgba(0, 0, 0, 0.14) 0%, rgba(0, 0, 0, 0.10) 100%)',
                      color: 'rgba(0, 0, 0, 0.87)',
                    }}
                  >
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        borderBottom: '2px solid rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="text.primary"
                        >
                          Wallet Addresses
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: '600', ml: 0.5 }}
                        >
                          ({result.recipients.length} items)
                        </Typography>
                      </Box>
                    </th>
                    <th
                      style={{
                        padding: '12px 16px',
                        textAlign: 'right',
                        fontSize: '0.875rem',
                        fontWeight: 600,
                        borderBottom: '2px solid rgba(0, 0, 0, 0.08)',
                      }}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-end',
                        }}
                      >
                        <Typography
                          variant="body2"
                          fontWeight="bold"
                          color="text.primary"
                        >
                          Amount
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ fontWeight: '600', ml: 0.5 }}
                        >
                          (total:{' '}
                          {(result.amount * result.recipients.length).toFixed(
                            8
                          )}{' '}
                          {result.token})
                        </Typography>
                      </Box>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.recipients.map((recipient, index) => (
                    <tr
                      key={recipient}
                      style={{
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                        backgroundColor:
                          index % 2 === 0
                            ? 'rgba(0, 0, 0, 0.02)'
                            : 'transparent',
                      }}
                    >
                      <td
                        style={{
                          padding: '12px 16px',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                        }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontFamily: 'monospace',
                              color: 'rgba(0, 0, 0, 0.87)',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              maxWidth: 'calc(100% - 40px)',
                            }}
                          >
                            {recipient}
                          </Typography>
                        </Box>
                      </td>
                      <td
                        style={{
                          padding: '12px 16px',
                          textAlign: 'right',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                        }}
                      >
                        {recipientAddresses[index].amount} {result.token}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
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
