'use client';
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: { main: '#000000', light: '#222222', dark: '#000000', contrastText: '#ffffff' },
    secondary: { main: '#ffffff', light: '#f5f5f5', dark: '#cccccc', contrastText: '#000000' },
    background: { default: '#f9f9f9', paper: '#ffffff' },
    text: { primary: '#000000', secondary: '#555555' },
    divider: '#e0e0e0',
    success: { main: '#1a1a1a' },
    error: { main: '#c62828' },
  },
  typography: {
    fontFamily: 'var(--font-geist-sans), Georgia, serif',
    h1: { fontWeight: 700, letterSpacing: '-0.02em' },
    h2: { fontWeight: 700, letterSpacing: '-0.01em' },
    h3: { fontWeight: 700, letterSpacing: '-0.01em' },
    h4: { fontWeight: 700 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 500 },
    button: { fontWeight: 600, letterSpacing: '0.04em' },
  },
  shape: { borderRadius: 0 },
  transitions: {
    duration: { shortest: 150, shorter: 200, short: 250, standard: 300, complex: 375 },
    easing: { easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)', sharp: 'cubic-bezier(0.4, 0, 0.6, 1)' },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          borderRadius: 0,
          fontWeight: 600,
          boxShadow: 'none',
          transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { boxShadow: 'none', transform: 'translateY(-1px)' },
          '&:active': { transform: 'translateY(0)' },
        },
        containedPrimary: {
          background: '#000',
          color: '#fff',
          '&:hover': { background: '#222', transform: 'translateY(-1px)' },
        },
        containedSecondary: {
          background: '#fff',
          color: '#000',
          border: '1px solid #000',
          '&:hover': { background: '#f0f0f0', transform: 'translateY(-1px)' },
        },
        outlinedPrimary: {
          borderColor: '#000',
          color: '#000',
          '&:hover': { background: '#000', color: '#fff', borderColor: '#000' },
        },
        outlinedSecondary: {
          borderColor: 'rgba(255,255,255,0.5)',
          color: '#fff',
          '&:hover': { background: 'rgba(255,255,255,0.1)', borderColor: '#fff' },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          transition: 'box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        },
        elevation1: { boxShadow: '0 1px 3px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.05)' },
        elevation2: { boxShadow: '0 2px 8px rgba(0,0,0,0.1), 0 8px 24px rgba(0,0,0,0.07)' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          overflow: 'hidden',
          transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 16px 40px rgba(0,0,0,0.15)' },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          fontWeight: 600,
          fontSize: 11,
          letterSpacing: '0.05em',
          transition: 'all 0.2s ease',
          '&:hover': { transform: 'scale(1.04)' },
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined' },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 0,
            transition: 'box-shadow 0.2s ease',
            '&:hover fieldset': { borderColor: '#000' },
            '&.Mui-focused fieldset': { borderColor: '#000', borderWidth: 2 },
            '&.Mui-focused': { boxShadow: '0 0 0 3px rgba(0,0,0,0.08)' },
          },
          '& label.Mui-focused': { color: '#000' },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiTableCell: { styleOverrides: { head: { fontWeight: 700, borderBottom: '2px solid #000' } } },
    MuiTableRow: {
      styleOverrides: {
        root: {
          transition: 'background 0.15s ease',
          '&:hover': { background: '#f5f5f5' },
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          boxShadow: 'none',
          borderBottom: '1px solid #000',
          transition: 'background 0.3s ease',
        },
      },
    },
    MuiDivider: { styleOverrides: { root: { borderColor: '#e0e0e0' } } },
    MuiIconButton: {
      styleOverrides: {
        root: {
          borderRadius: 0,
          transition: 'all 0.2s ease',
          '&:hover': { background: '#f0f0f0', transform: 'scale(1.1)' },
        },
      },
    },
    MuiListItem: {
      styleOverrides: {
        root: { transition: 'background 0.15s ease' },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          transition: 'background 0.15s ease, padding-left 0.2s ease',
          '&:hover': { paddingLeft: '20px', background: '#f5f5f5' },
          '&.Mui-selected': { background: '#000', color: '#fff', '&:hover': { background: '#222' } },
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          transition: 'color 0.2s ease',
          '&:hover': { color: '#000' },
        },
      },
    },
    MuiSwitch: {
      styleOverrides: {
        switchBase: {
          '&.Mui-checked': { color: '#000' },
          '&.Mui-checked + .MuiSwitch-track': { backgroundColor: '#000' },
        },
      },
    },
    MuiCheckbox: {
      styleOverrides: {
        root: {
          transition: 'transform 0.15s ease',
          '&:hover': { transform: 'scale(1.15)' },
          '&.Mui-checked': { color: '#000' },
        },
      },
    },
    MuiRadio: {
      styleOverrides: {
        root: {
          transition: 'transform 0.15s ease',
          '&:hover': { transform: 'scale(1.15)' },
          '&.Mui-checked': { color: '#000' },
        },
      },
    },
    MuiStepIcon: {
      styleOverrides: {
        root: {
          transition: 'transform 0.2s ease',
          '&.Mui-active': { color: '#000', transform: 'scale(1.15)' },
          '&.Mui-completed': { color: '#000' },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: { borderRadius: 0, background: '#000', fontSize: 12, letterSpacing: '0.03em' },
        arrow: { color: '#000' },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 0 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 0 },
      },
    },
    MuiLinearProgress: {
      styleOverrides: {
        root: { borderRadius: 0 },
        bar: { background: '#000' },
      },
    },
  },
});

export default theme;
