import { useState } from 'react';
import {
  List,
  ListItem,
  ListItemButton,
  Collapse,
  IconButton,
  Typography,
  Box,
  Chip,
  Card,
  CardContent,
} from '@mui/material';
import { ExpandMore } from '@mui/icons-material';
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

  const handleGroupToggle = () => {
    setIsExpanded(!isExpanded);
  };

  const successCount = serializer.results.filter(
    (result) => result.status === 'success'
  ).length;
  const totalCount = serializer.results.length;
  const totalAmount = serializer.results.reduce(
    (sum, result) => sum + result.totalAmount,
    0
  );
  const timestamp = serializer.results[0]?.timestamp || Date.now();
  const token = serializer.results[0]?.token || 'Unknown';

  return (
    <Card
      sx={{
        mb: 2,
        border: '1px solid rgba(0, 0, 0, 0.12)',
        borderRadius: 2,
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <ListItemButton
          onClick={handleGroupToggle}
          sx={{
            backgroundColor: (theme) =>
              isExpanded
                ? theme.palette.primary.main + '14'
                : 'rgba(0, 0, 0, 0.02)',
            borderRadius: 2,
            '&:hover': {
              backgroundColor: (theme) => theme.palette.primary.main + '1A',
            },
          }}
        >
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              p: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <IconButton
                  size="small"
                  sx={{
                    color: (theme) => theme.palette.primary.main,
                    transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)',
                  }}
                  onClick={(e) => e.stopPropagation()}
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
                  Transaction Group ({token})
                </Typography>
              </Box>
              <Typography
                variant="caption"
                sx={{
                  ml: 5,
                  color: (theme) => theme.palette.text.secondary,
                  fontSize: '0.85rem',
                }}
              >
                {new Date(timestamp).toLocaleString()}
              </Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 1.5 }}>
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
            </Box>
          </Box>
        </ListItemButton>
        <Collapse in={isExpanded} unmountOnExit>
          <List
            component="div"
            disablePadding
            sx={{
              backgroundColor: (theme) => theme.palette.background.paper,
              borderTop: '1px solid rgba(0, 0, 0, 0.12)',
            }}
          >
            {serializer.results.map(
              (result: TransactionResult, index: number) => (
                <ListItem
                  key={`${result.signature}-${index}`}
                  sx={{
                    px: 2,
                    py: 1,
                    borderBottom:
                      index !== serializer.results.length - 1
                        ? '1px solid rgba(0, 0, 0, 0.06)'
                        : 'none',
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
        </Collapse>
      </CardContent>
    </Card>
  );
};

export default SerializerList;
