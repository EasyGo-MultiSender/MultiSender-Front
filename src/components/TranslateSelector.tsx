import React, { useState } from 'react';
import { IconButton, Menu, MenuItem } from '@mui/material';
import TranslateIcon from '@mui/icons-material/Translate';
import i18n from '@/locales/i18n';
import { availableLanguages } from '@/locales/languages';

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
        <TranslateIcon />
      </IconButton>
      <Menu anchorEl={anchorEl} open={open} onClose={handleMenuClose}>
        {availableLanguages.map((language) => (
          <MenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            selected={i18n.language === language.code}
            sx={{
              ...(i18n.language === language.code && {
                backgroundColor: '#dbe7ff !important', // 選択時の背景色（任意で変更）
              }),
            }}
          >
            {language.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
};

export default TranslateSelector;
