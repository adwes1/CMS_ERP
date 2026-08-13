import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#00ffd7', contrastText: '#050706' },
    secondary: { main: '#ff00af' },
    success: { main: '#00ff87' },
    warning: { main: '#ffff00' },
    error: { main: '#ff3b3b' },
    background: { default: '#050706', paper: '#050706' },
    text: { primary: '#5fd7ff', secondary: '#6d92a0' },
    divider: '#365466',
    action: { selected: 'rgba(0, 255, 215, 0.07)', hover: 'rgba(0, 255, 215, 0.1)' },
  },
  typography: {
    fontFamily: '"JetBrains Mono", ui-monospace, monospace',
    fontSize: 13,
    h1: { fontSize: 'clamp(1.35rem, 3vw, 2rem)', fontWeight: 600, letterSpacing: '0.02em' },
    h2: { fontSize: '1rem', fontWeight: 600 },
    overline: { fontSize: '0.68rem', letterSpacing: '0.12em' },
    button: { textTransform: 'uppercase', fontWeight: 400, letterSpacing: '0.03em' },
  },
  shape: { borderRadius: 0 },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        '*': { boxSizing: 'border-box' },
        'html, body, #root': { height: '100%', margin: 0 },
        body: { minWidth: 320, backgroundColor: '#050706' },
        '::selection': { backgroundColor: '#00ffd7', color: '#050706' },
        '::-webkit-scrollbar': { width: 8, height: 8 },
        '::-webkit-scrollbar-track': { backgroundColor: '#050706' },
        '::-webkit-scrollbar-thumb': { backgroundColor: '#365466' },
      },
    },
    MuiButton: {
      defaultProps: { disableElevation: true },
      styleOverrides: { root: { borderRadius: 0 } },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: 'none' } } },
    MuiDialog: {
      styleOverrides: { paper: { border: '1px solid #365466' } },
    },
    MuiAlert: {
      styleOverrides: { root: { borderRadius: 0, border: '1px solid currentColor', backgroundColor: 'transparent' } },
    },
    MuiTextField: {
      defaultProps: { variant: 'outlined', size: 'small' },
    },
  },
});
