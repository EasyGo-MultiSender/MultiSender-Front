import { useState, useRef, useEffect } from 'react';
import {
  List,
  ListItem,
  Collapse,
  IconButton,
  Typography,
  Box,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import { ExpandMore, Download } from '@mui/icons-material';
import {
  TransactionResult,
  Serializer as SerializerType,
} from '../types/transactionTypes';
import { TransactionResultItem } from './TransactionResultItem';

interface SerializerListProps {
  serializer: SerializerType;
  connection: any;
}

const SerializerList: React.FC<SerializerListProps> = ({
  serializer,
  connection,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleGroupToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const handleDownload = (e: React.MouseEvent) => {
    e.stopPropagation();
    // ダウンロード処理をここに実装
    console.log('Download clicked for:', serializer);
  };

  useEffect(() => {
    if (isExpanded && contentRef.current) {
      setTimeout(() => {
        contentRef.current?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
      }, 10);
    }
  }, [isExpanded]);

  const successCount = serializer.results.filter(
    (result) => result.status === 'success'
  ).length;
  const totalCount = serializer.results.length;
  const totalAmount = serializer.results.reduce(
    (sum, result) => sum + result.totalAmount,
    0
  );
  const timestamp = serializer.results[0]?.timestamp;
  const token = serializer.results[0]?.token;

  return (
    <Card
      sx={{
        mb: 2,
        border: '2px solid rgba(0, 0, 0, 0.2)',
        borderRadius: 2,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box
          onClick={handleGroupToggle}
          sx={{
            backgroundColor: (theme) =>
              isExpanded
                ? theme.palette.primary.main + '22'
                : 'rgba(0, 0, 0, 0.04)',
            cursor: 'pointer',
            '&:hover': {
              backgroundColor: (theme) => theme.palette.primary.main + '30',
              transition: 'background-color 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              py: 1.2,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  size="small"
                  sx={{
                    color: (theme) => theme.palette.primary.main,
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                    transition: 'transform 0.8s cubic-bezier(0.4, 0, 0.2, 1)',
                    '&:hover': {
                      backgroundColor: 'transparent',
                    },
                  }}
                >
                  <ExpandMore />
                </IconButton>
                <Typography
                  variant="h6"
                  sx={{
                    fontSize: '1.1rem',
                    fontWeight: 600,
                    color: (theme) => theme.palette.text.primary,
                  }}
                >
                  Serializer ({token})
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  ml: 5,
                  color: (theme) => theme.palette.text.secondary,
                  fontSize: '0.8rem',
                  lineHeight: 1.2,
                }}
              >
                {new Date(timestamp).toLocaleString()}
              </Typography>
            </Box>
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mr: 2 }}
            >
              <Chip
                label={`Success: ${successCount}/${totalCount}`}
                color={successCount === totalCount ? 'success' : 'warning'}
                size="small"
                sx={{
                  fontWeight: 500,
                  px: 1,
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
              <Chip
                label={`Total: ${totalAmount.toFixed(6)}`}
                color="primary"
                size="small"
                sx={{
                  fontWeight: 500,
                  px: 1,
                  '& .MuiChip-label': {
                    px: 1,
                  },
                }}
              />
              <IconButton
                size="small"
                color="primary"
                sx={{
                  ml: 0.5,
                  transition: 'transform 0.3s ease',
                  '&:hover': {
                    transform: 'scale(1.1)',
                  },
                }}
                onClick={handleDownload}
              >
                <Download fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        </Box>
        <Collapse in={isExpanded} unmountOnExit timeout={800}>
          <Box ref={contentRef}>
            <List
              component="div"
              disablePadding
              sx={{
                backgroundColor: 'transparent',
                borderTop: '2px solid rgba(0, 0, 0, 0.2)',
                boxShadow: 'inset 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                pt: 1.5,
              }}
            >
              {serializer.results.map(
                (result: TransactionResult, index: number) => (
                  <ListItem
                    key={`${result.signature}-${index}`}
                    sx={{
                      px: 2,
                      py: 1,
                    }}
                  >
                    <TransactionResultItem
                      result={result}
                      connection={connection}
                    />
                  </ListItem>
                )
              )}
            </List>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default SerializerList;
