import { Box } from '@mui/material';
import { useTranslation } from 'react-i18next';
import Header from '@/components/Header';

const NotFound = () => {
  const { t } = useTranslation();

  return (
    <Box
      sx={{
        width: '100vw',
        height: '100vh',
        display: 'flex',
        position: 'relative',
      }}
    >
      <Header />
      <Box sx={{ margin: 'auto' }}>
        <h1 className="text-2xl font-bold text-red-500">404 Not Found</h1>
        <p>{t('Oops! The page you are looking for does not exist.')}</p>
      </Box>
    </Box>
  );
};
export default NotFound;
