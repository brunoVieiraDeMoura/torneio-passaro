'use client'

import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  cssVariables: true,
  palette: {
    mode: 'light',
    primary: {
      main: '#0D8F41',
      dark: '#0B7A36',
      light: '#15A84E',
      contrastText: '#fff',
    },
    error: {
      main: '#DC2626',
    },
    warning: {
      main: '#D97706',
    },
    success: {
      main: '#0D8F41',
    },
    background: {
      default: '#FAFAFA',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A1A',
      secondary: '#71717A',
      disabled: '#A1A1AA',
    },
    divider: '#E4E4E7',
  },
  typography: {
    fontFamily: 'var(--font-inter), -apple-system, system-ui, sans-serif',
    h1: { fontWeight: 700, color: '#1A1A1A' },
    h2: { fontWeight: 700, color: '#1A1A1A' },
    h3: { fontWeight: 600, color: '#1A1A1A' },
    body1: { color: '#1A1A1A', lineHeight: 1.6 },
    body2: { color: '#71717A', lineHeight: 1.5 },
    caption: { color: '#A1A1AA' },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 12,
          paddingTop: 12,
          paddingBottom: 12,
        },
        sizeLarge: {
          fontSize: '1rem',
          paddingTop: 14,
          paddingBottom: 14,
        },
      },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', fullWidth: true },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: 10,
            backgroundColor: '#fff',
            '&:hover .MuiOutlinedInput-notchedOutline': {
              borderColor: '#0D8F41',
            },
            '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
              borderColor: '#0D8F41',
            },
          },
        },
      },
    },
    MuiAlert: {
      styleOverrides: {
        root: { borderRadius: 10 },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          border: '1px solid #E4E4E7',
          boxShadow: 'none',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FAFAFA',
          color: '#1A1A1A',
        },
      },
    },
  },
})

export default theme
