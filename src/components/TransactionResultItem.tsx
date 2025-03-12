import {
  CheckCircleOutline,
  ContentCopy,
  ErrorOutline,
  OpenInNew,
  WarningAmber,
} from '@mui/icons-material';
import {
  Box,
  Chip,
  Typography,
  ListItem,
  IconButton,
  Link,
  Tooltip,
  Button,
} from '@mui/material';
import { useState } from 'react';

interface AddressEntry {
  address: string;
  amount: number;
}

interface TransactionResult {
  signature: string;
  status: 'success' | 'error' | 'warn';
  timestamp: number;
  error?: string;
  errorMessage?: string;
  recipients: AddressEntry[];
  totalAmount: number;
  token: string;
}

interface TransactionResultItemProps {
  result: TransactionResult;
  connection: {
    rpcEndpoint: string;
  };
}

export const TransactionResultItem = ({
  result,
  connection,
}: TransactionResultItemProps) => {
  const [isCopiedSignature, setIsCopiedSignature] = useState(false);
  const [isCopiedAll, setIsCopiedAll] = useState(false);

  // 'warn'を'warning'に変換
  const getStatusColor = (
    status: 'success' | 'error' | 'warn'
  ): 'success' | 'error' | 'warning' => {
    if (status === 'warn') return 'warning';
    return status;
  };

  const handleCopy = async (
    text: string,
    setCopied: (value: boolean) => void
  ) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 1000);
  };

  return (
    <ListItem
      sx={{
        position: 'relative',
        bgcolor: '#f5f5f5',
        borderRadius: 2,
        my: 1,
        flexDirection: 'column',
        alignItems: 'flex-start',
        p: 2,
        backgroundColor: 'rgba(0, 0, 0, 0.05)',
        border: '0.3px solid rgba(0, 0, 0, 0.2)',
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.08)',
        width: '97%',
        mx: 'auto',
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
            label={getStatusColor(result.status)}
            color={getStatusColor(result.status)}
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
          height: '36px',
          mb: 2,
          p: 1,
          mt: 1.5,
          backgroundColor: 'rgba(0, 0, 0, 0.07)',
          borderRadius: '4px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
        }}
      >
        {getStatusColor(result.status) === 'success' ? (
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
            <Tooltip title="Open in Solscan" arrow placement="top">
              <Box
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  ml: 1,
                  mt: 1,
                }}
              >
                <OpenInNew sx={{ fontSize: 18 }} />
                <Typography variant="caption" sx={{ mt: -0.4 }}>
                  link
                </Typography>
              </Box>
            </Tooltip>
          </Link>
        ) : (
          result.errorMessage
        )}

        <Tooltip
          title={isCopiedSignature ? 'Copied !' : 'Copy Signature'}
          arrow
          placement="top"
        >
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              handleCopy(result.signature, setIsCopiedSignature);
            }}
            sx={{
              display: 'flex',
              flexDirection: 'column',
              width: 38,
              height: 38,
              padding: 0,
            }}
          >
            <ContentCopy fontSize="small" sx={{ mt: -0.5 }} />
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                bottom: -1.0,
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '0.6rem',
              }}
            >
              copy
            </Typography>
          </IconButton>
        </Tooltip>
      </Box>

      {/* Transfer Information */}

      <Box
        sx={{
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderRadius: 1,
          px: 1,
          mx: 'auto',
        }}
      >
        <Box width="100%">
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              pb: 1,
            }}
          >
            <Tooltip
              title={isCopiedAll ? 'Copied !' : 'Copy All'}
              arrow
              placement="top"
            >
              <Button
                variant="text"
                size="small"
                startIcon={<ContentCopy fontSize="small" />}
                onClick={() => {
                  const dataToCopy = result.recipients
                    .map(
                      (recipient) =>
                        `${recipient.address}, ${recipient.amount} `
                    )
                    .join('\n');
                  handleCopy(dataToCopy, setIsCopiedAll);
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
            </Tooltip>
          </Box>

          <Box
            sx={{
              width: '100%',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
              borderRadius: '6px',
              border: '1px solid rgba(0, 0, 0, 0.16)',
              overflow: 'hidden',
            }}
          >
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead
                style={{
                  background:
                    'linear-gradient(180deg, rgba(0, 0, 0, 0.14) 0%, rgba(0, 0, 0, 0.10) 100%)',
                  color: 'rgba(0, 0, 0, 0.87)',
                  display: 'table',
                  width: '100%',
                  tableLayout: 'fixed',
                }}
              >
                <tr>
                  <th
                    style={{
                      padding: '9px 24px',
                      textAlign: 'left',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      borderBottom: '2px solid rgba(0, 0, 0, 0.08)',
                      width: '70%',
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
                      padding: '9px 16px',
                      textAlign: 'right',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      borderBottom: '2px solid rgba(0, 0, 0, 0.08)',
                      width: '30%',
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
                        {(
                          result.totalAmount * result.recipients.length
                        ).toFixed(8)}{' '}
                        {result.token})
                      </Typography>
                    </Box>
                  </th>
                </tr>
              </thead>
            </table>
            <Box
              sx={{
                maxHeight: '120px',
                overflowY: 'auto',
                overflowX: 'hidden',

                // Webkit系ブラウザ用スクロールバースタイル
                '&::-webkit-scrollbar': {
                  width: '5px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'transparent',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(0, 0, 0, 0.2)',
                  borderRadius: '3px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: 'rgba(0, 0, 0, 0.3)',
                },
              }}
            >
              <table
                style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                }}
              >
                <tbody>
                  {result.recipients.map((recipient, index) => (
                    <tr
                      key={recipient.address}
                      style={{
                        display: 'table',
                        width: '100%',
                        tableLayout: 'fixed',
                        borderBottom: '1px solid rgba(0, 0, 0, 0.08)',
                        backgroundColor:
                          index % 2 === 0
                            ? 'rgba(0, 0, 0, 0.02)'
                            : 'transparent',
                      }}
                    >
                      <td
                        style={{
                          padding: '0px 24px',
                          fontSize: '0.875rem',
                          fontFamily: 'monospace',
                          height: '40px',
                          width: '70%',
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
                            {recipient.address}
                          </Typography>
                        </Box>
                      </td>
                      <td
                        style={{
                          padding: '0px 16px',
                          textAlign: 'right',
                          fontSize: '0.875rem',
                          fontWeight: 500,
                          height: '40px',
                          width: '30%',
                        }}
                      >
                        {recipient.amount} {result.token}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          </Box>
        </Box>
      </Box>
      {/* Error Message */}
      {result.error && (
        <Box
          sx={{
            mt: 2,
            width: '100%',
            backgroundColor:
              result.status === 'warn'
                ? 'warning.light'
                : result.error.includes('MultiSenderServerError')
                  ? 'warning.light'
                  : 'error.light',
            borderRadius: 2,
            overflow: 'hidden',
            boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          }}
        >
          {/* 送金成功部分があるか確認 */}
          {result.error.includes('送金は成功') ||
          result.error.includes('MultiSenderServerError') ? (
            <>
              {/* 送金成功メッセージ */}
              <Box
                sx={{
                  p: 1.5,
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: 'success.light',
                  borderBottom: '1px solid rgba(255,255,255,0.2)',
                }}
              >
                <CheckCircleOutline sx={{ color: 'white', mr: 1.5 }} />
                <Typography variant="subtitle2" fontWeight="bold" color="white">
                  送金処理は正常に完了しています
                </Typography>
              </Box>

              {/* エラー詳細 */}
              <Box sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start' }}>
                <WarningAmber sx={{ color: 'white', mr: 1.5, mt: 0.2 }} />
                <Box>
                  <Typography
                    variant="subtitle2"
                    color="white"
                    fontWeight="medium"
                  >
                    データの保存に失敗しました
                  </Typography>
                  <Typography
                    variant="body2"
                    color="white"
                    sx={{ opacity: 0.9, mt: 0.5 }}
                  >
                    {result.error.includes('MultiSenderServerError')
                      ? 'サーバーと通信できませんでした。履歴ページには反映されません。'
                      : 'データをサーバーに保存できませんでした。履歴ページには反映されません。'}
                  </Typography>
                  <Typography
                    variant="caption"
                    color="white"
                    sx={{ opacity: 0.8, display: 'block', mt: 0.5 }}
                  >
                    ※ ウォレットアプリで送金状況をご確認ください
                  </Typography>
                </Box>
              </Box>
            </>
          ) : (
            // 通常のエラーメッセージ
            <Box sx={{ p: 1.5, display: 'flex', alignItems: 'flex-start' }}>
              <ErrorOutline sx={{ color: 'white', mr: 1.5, mt: 0.2 }} />
              <Box>
                <Typography
                  variant="subtitle2"
                  color="white"
                  fontWeight="medium"
                >
                  エラーが発生しました
                </Typography>
                <Typography variant="body2" color="white" sx={{ mt: 0.5 }}>
                  {result.error}
                </Typography>
              </Box>
            </Box>
          )}
        </Box>
      )}
    </ListItem>
  );
};
