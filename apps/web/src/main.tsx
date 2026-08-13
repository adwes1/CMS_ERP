import React from 'react';
import ReactDOM from 'react-dom/client';
import { CssBaseline, ThemeProvider } from '@mui/material';
import '@fontsource/jetbrains-mono/400.css';
import '@fontsource/jetbrains-mono/600.css';
import '@fontsource/jetbrains-mono/700.css';
import App from './App';
import { initializeAuthentication } from './auth/keycloak';
import { theme } from './theme';

const root = ReactDOM.createRoot(document.getElementById('root')!);

function render(content: React.ReactNode) {
  root.render(
    <React.StrictMode>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {content}
      </ThemeProvider>
    </React.StrictMode>,
  );
}

render('Sichere Sitzung wird vorbereitet …');

initializeAuthentication()
  .then(() => render(<App />))
  .catch((error: unknown) => {
    console.error(error);
    render('Die Anmeldung konnte nicht initialisiert werden. Bitte lade die Seite erneut.');
  });

