import React, { useState } from 'react';
import { Box, Typography, IconButton, Button, Popover } from '@mui/material';
import { Email, Info } from '@mui/icons-material';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SvgIcon from '@mui/material/SvgIcon';

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
        backgroundColor: '#1E2142',
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
                color: '#78C1FD',
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
            sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}
          >
            This site is protected by reCAPTCHA and the Google{' '}
            <a
              href="https://policies.google.com/privacy"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1976d2', textDecoration: 'none' }}
            >
              Privacy Policy
            </a>{' '}
            and{' '}
            <a
              href="https://policies.google.com/terms"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#1976d2', textDecoration: 'none' }}
            >
              Terms of Service
            </a>{' '}
            apply.
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
              Contact Us
            </Typography>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.2 }}>
              <IconButton
                href="mailto:contact@easy-go.me"
                color="inherit"
                sx={{
                  '&:hover': {
                    color: '#78C1FD',
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
                    color: '#78C1FD',
                  },
                }}
              >
                <XIcon />
              </IconButton>
            </Box>
          </Box>

          <Button
            href="https://murasakibv.medium.com/"
            target="_blank"
            rel="noopener noreferrer"
            sx={{
              bgcolor: '#2D325A',
              color: 'white',
              px: 1.6,
              py: 0.8,
              borderRadius: 2,
              textTransform: 'none',
              display: 'flex',
              alignItems: 'center',
              '&:hover': {
                bgcolor: '#373B6A',
              },
            }}
          >
            <RocketLaunchIcon sx={{ mr: 1.5 }} />
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
              }}
            >
              Help Center
            </Typography>
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default Footer;
