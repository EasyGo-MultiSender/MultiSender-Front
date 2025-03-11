import React from 'react';
import { Box, Typography, IconButton, Button } from '@mui/material';
import { Email } from '@mui/icons-material';
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
  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
      }}
    >
      <Box
        component="footer"
        sx={{
          bgcolor: '#1E2142',
          color: 'white',
          py: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          px: 4,
        }}
      >
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
            href="https://x.com/MurasakiBV"
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

        <Button
          href="https://murasakibv.medium.com/"
          target="_blank"
          rel="noopener noreferrer"
          sx={{
            ml: 3,
            bgcolor: '#2D325A',
            color: 'white',
            px: 2,
            py: 1,
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
  );
};

export default Footer;
