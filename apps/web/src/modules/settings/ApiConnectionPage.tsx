import { Box, Button, Chip, Stack, Typography } from '@mui/material';

const resources = [
  { name: 'Adressen', path: '/api/addresses', description: 'Kunden-, Lieferanten- und Kontaktdaten' },
  { name: 'Artikel', path: '/api/articles', description: 'Artikelstamm und Bestandsinformationen' },
  { name: 'Artikeleinheiten', path: '/api/article-units', description: 'Einheiten für den Artikelstamm' },
  { name: 'Lagerplätze', path: '/api/warehouse-locations', description: 'Lagerorte, Regale und Positionen' },
  { name: 'Spezifikationen', path: '/api/specifications', description: 'Quellen und Projektzuordnungen' },
];

export function ApiConnectionPage() {
  const baseUrl = `${window.location.origin}/api`;

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / EINSTELLUNGEN / API-ANBINDUNG</Typography>
        <Typography variant="h1">API-Anbindung</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Technischer Zugang zur eigenen CMS-ERP-REST-API.
        </Typography>
      </Box>

      <Box sx={{ maxWidth: 920, borderTop: 1, borderColor: 'divider' }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          gap={2}
          sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}
        >
          <Box>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 0.75 }}>
              <Typography variant="h2">CMS ERP REST-API</Typography>
              <Chip label="AKTIV" color="success" size="small" variant="outlined" />
            </Stack>
            <Typography color="text.secondary">JSON-Schnittstelle für den Zugriff auf die zentralen Stammdaten.</Typography>
          </Box>
          <Button variant="outlined" onClick={() => void navigator.clipboard.writeText(baseUrl)} sx={{ whiteSpace: 'nowrap' }}>
            Basis-URL kopieren
          </Button>
        </Stack>

        <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' }, gap: '10px 24px', py: 2, m: 0, borderBottom: 1, borderColor: 'divider' }}>
          <Typography component="dt" color="text.secondary">BASIS-URL</Typography>
          <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>{baseUrl}</Typography>
          <Typography component="dt" color="text.secondary">DATENFORMAT</Typography>
          <Typography component="dd" sx={{ m: 0 }}>JSON</Typography>
          <Typography component="dt" color="text.secondary">AUTHENTIFIZIERUNG</Typography>
          <Typography component="dd" sx={{ m: 0 }}>OAuth 2.0 / OpenID Connect (Bearer-Token)</Typography>
          <Typography component="dt" color="text.secondary">TRANSPORT</Typography>
          <Typography component="dd" sx={{ m: 0 }}>HTTPS</Typography>
        </Box>
      </Box>

      <Box sx={{ maxWidth: 920 }}>
        <Typography variant="h2" sx={{ mb: 0.75 }}>Verfügbare Ressourcen</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Der Zugriff richtet sich nach den Rollen und Rechten des angemeldeten Benutzers.
        </Typography>
        <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
          {resources.map((resource) => (
            <Box
              key={resource.path}
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: '180px minmax(190px, 1fr) 2fr' },
                gap: { xs: 0.5, md: 2 },
                alignItems: 'center',
                py: 1.5,
                borderBottom: 1,
                borderColor: 'divider',
              }}
            >
              <Typography>{resource.name}</Typography>
              <Typography color="primary.main" sx={{ overflowWrap: 'anywhere' }}>{resource.path}</Typography>
              <Typography color="text.secondary">{resource.description}</Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Stack>
  );
}
