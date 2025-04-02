import { Email, Info } from '@mui/icons-material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import {
  Box,
  Typography,
  IconButton,
  Button,
  Popover,
  SvgIcon,
} from '@mui/material';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { COLORS } from '@/constants/color';
// Xのカスタムアイコン
const XIcon = () => (
  <SvgIcon viewBox="0 0 24 24">
    <path
      fill="currentColor"
      d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"
    />
  </SvgIcon>
);

const Footer: React.FC = () => {
  const [anchorEl, setAnchorEl] = useState<HTMLElement | null>(null);
  const { t } = useTranslation(); // 翻訳フック

  const handleInfoClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleInfoClose = () => {
    setAnchorEl(null);
  };

  const open = Boolean(anchorEl);

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '8vh',
        backgroundColor: COLORS.PURPLE.DARK,
        boxShadow: '0px 0px 10px 0px rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      }}
    >
      <Box
        component="footer"
        sx={{
          height: '100%',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          pr: 2,
          pl: 1.5,
        }}
      >
        <Box>
          <IconButton
            color="inherit"
            onClick={handleInfoClick}
            sx={{
              '&:hover': {
                color: COLORS.BLUE.TURQUOISE,
              },
            }}
            aria-label="information"
          >
            <Info />
          </IconButton>
        </Box>

        <Popover
          open={open}
          anchorEl={anchorEl}
          onClose={handleInfoClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'left',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'left',
          }}
          sx={{
            '& .MuiPopover-paper': {
              maxWidth: { xs: '80vw', sm: '400px' },
              bgcolor: '#f5f5f5',
            },
          }}
        >
          <Typography
            variant="body2"
            sx={{
              fontSize: { xs: '0.75rem', sm: '0.875rem' },
              mx: 1,
              color: COLORS.PURPLE.LIGHT,
            }}
          >
            {t('This site is protected by reCAPTCHA and the Google')}{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: COLORS.GRAY.LIGHT, textDecoration: 'none' }}
            >
              {t('Privacy Policy')}
            </a>{' '}
            {t('and')}{' '}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: COLORS.GRAY.LIGHT, textDecoration: 'none' }}
            >
              {t('Terms of Service')}
            </a>{' '}
            {t('apply.')}
          </Typography>
        </Popover>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Typography
              variant="body1"
              sx={{
                color: 'white',
                fontWeight: 500,
                mr: 1.0,
              }}
            >
              {t('Contact Us')}
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
              <IconButton
                href="mailto:contact@easy-go.me"
                color="inherit"
                sx={{
                  '&:hover': {
                    color: COLORS.BLUE.TURQUOISE,
                    transition: 'all 0.2s ease',
                  },
                }}
              >
                <Email />
              </IconButton>

              <IconButton
                href="https://x.com/easymultisender"
                target="_blank"
                rel="noopener noreferrer"
                color="inherit"
                sx={{
                  '&:hover': {
                    color: COLORS.BLUE.TURQUOISE,
                    transition: 'all 0.2s ease',
                  },
                }}
              >
                <XIcon />
              </IconButton>
            </Box>
          </Box>

          <Button
            href="https://murasakibv.medium.com/easygo-solana-multisender-fast-cheap-airdrops-how-to-guide-6607c079c446"
            target="_blank"
            sx={{
              bgcolor: COLORS.PURPLE.MEDIUM_BRIGHT,
              color: 'white',
              px: 1.6,
              py: 0.76,
              borderRadius: 2,
              textTransform: 'none',
              display: 'flex',
              alignItems: 'center',
              '&:hover': {
                transition: 'all 0.2s ease',
                bgcolor: '#504194',
                color: '#e6f0f7',
              },
            }}
          >
            <RocketLaunchIcon sx={{ mr: 1.5, fontSize: '1.2rem' }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
              }}
            >
              {t('Help Center')}
            </Typography>
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
