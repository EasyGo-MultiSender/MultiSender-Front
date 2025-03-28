import React, { useState } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import i18n from '@/locales/i18n';
import { availableLanguages } from '@/locales/languages';
import COLORS from '@/constants/color';

const TranslateSelector = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    handleMenuClose();
  };

  return (
    <>
      <IconButton
        color="inherit"
        onClick={handleMenuOpen}
        sx={{
          transition: 'all 0.3s ease',
          '&:hover': {
            backgroundColor: '#250c46',
          },
        }}
      >
        <img
          src="icons/translate.svg"
          alt="translate"
          style={{ width: '27px', height: '27px' }}
        />
      </IconButton>
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={handleMenuClose}
        TransitionProps={{
          onExiting: (node) => {
            node.style.animation = 'dropdownFadeOut 0.2s ease';
          },
        }}
        sx={{
          '& .MuiPaper-root': {
            backgroundColor: COLORS.PURPLE.MEDIUM,
            color: COLORS.GRAY.LIGHT,
            borderRadius: '8px',
            minWidth: '160px',
            border: '0.05px solid #7867ea6a',
            padding: '0 8px',
            gap: '4px',
            marginTop: '8px',
            animation: 'dropdownFadeIn 0.2s ease',
            transformOrigin: 'top',
          },
          '& .MuiMenuItem-root': {
            fontSize: '1rem',
            fontWeight: 500,
            padding: '8px 12px',
            borderRadius: '4px',
            transition: 'background-color 0.2s ease',
            '&:hover': {
              backgroundColor: 'rgba(3, 176, 228, 0.1)',
            },
            '&.Mui-selected': {
              backgroundColor: 'rgba(3, 176, 228, 0.2)',
              '&:hover': {
                backgroundColor: 'rgba(3, 176, 228, 0.3)',
              },
            },
          },
          '@keyframes dropdownFadeIn': {
            from: {
              opacity: 0,
              transform: 'scaleY(0.9)',
            },
            to: {
              opacity: 1,
              transform: 'scaleY(1)',
            },
          },
          '@keyframes dropdownFadeOut': {
            from: {
              opacity: 1,
              transform: 'scaleY(1)',
            },
            to: {
              opacity: 0,
              transform: 'scaleY(0.9)',
            },
          },
        }}
      >
        {availableLanguages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={i18n.language === language.code}
          >
            {language.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default TranslateSelector;
