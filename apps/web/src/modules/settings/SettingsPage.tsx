import { Box, Button, Stack, Typography } from '@mui/material';

type SettingsPageProps = {
  onOpenUsers: () => void;
  onOpenSpecifications: () => void;
  onOpenArticles: () => void;
  onOpenPaymentMethods: () => void;
  onOpenInterfaces: () => void;
  onOpenApiConnection: () => void;
  onOpenCronJobs: () => void;
};

export function SettingsPage({ onOpenUsers, onOpenSpecifications, onOpenArticles, onOpenPaymentMethods, onOpenInterfaces, onOpenApiConnection, onOpenCronJobs }: SettingsPageProps) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / ADMINISTRATION</Typography>
        <Typography variant="h1">Einstellungen</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>Zentrale Verwaltung des Systems und seiner Zugänge.</Typography>
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', maxWidth: 760 }}>
        <Button onClick={onOpenUsers} fullWidth sx={{ justifyContent: 'space-between', py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <span>BENUTZERVERWALTUNG</span>
          <Box component="span" sx={{ color: 'success.main' }}>BEREIT &gt;</Box>
        </Button>
        <Typography color="text.secondary" sx={{ py: 1.5 }}>
          Benutzer, Zugänge, Status und Administratorrechte verwalten.
        </Typography>
        <Button onClick={onOpenSpecifications} fullWidth sx={{ justifyContent: 'space-between', py: 1.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <span>SPEZIFIKATIONEN</span>
          <Box component="span" sx={{ color: 'success.main' }}>BEREIT &gt;</Box>
        </Button>
        <Typography color="text.secondary" sx={{ py: 1.5 }}>
          Quellen und Projektnamen für Adressen verwalten.
        </Typography>
        <Button onClick={onOpenArticles} fullWidth sx={{ justifyContent: 'space-between', py: 1.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <span>ARTIKEL</span>
          <Box component="span" sx={{ color: 'success.main' }}>BEREIT &gt;</Box>
        </Button>
        <Typography color="text.secondary" sx={{ py: 1.5 }}>
          Vorlagen und Auswahllisten wie Artikeleinheiten verwalten.
        </Typography>
        <Button onClick={onOpenPaymentMethods} fullWidth sx={{ justifyContent: 'space-between', py: 1.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <span>ZAHLUNGSARTEN</span>
          <Box component="span" sx={{ color: 'success.main' }}>BEREIT &gt;</Box>
        </Button>
        <Typography color="text.secondary" sx={{ py: 1.5 }}>
          Zahlungsarten für die Buchhaltung anlegen und verwalten.
        </Typography>
        <Button onClick={onOpenInterfaces} fullWidth sx={{ justifyContent: 'space-between', py: 1.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <span>SCHNITTSTELLEN</span>
          <Box component="span" sx={{ color: 'success.main' }}>BEREIT &gt;</Box>
        </Button>
        <Typography color="text.secondary" sx={{ py: 1.5 }}>
          Externe Anbieter wie Shopware anbinden und verwalten.
        </Typography>
        <Button onClick={onOpenApiConnection} fullWidth sx={{ justifyContent: 'space-between', py: 1.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <span>API-ANBINDUNG</span>
          <Box component="span" sx={{ color: 'success.main' }}>BEREIT &gt;</Box>
        </Button>
        <Typography color="text.secondary" sx={{ py: 1.5 }}>
          Technischen Zugang zur eigenen CMS-ERP-REST-API einsehen.
        </Typography>
        <Button onClick={onOpenCronJobs} fullWidth sx={{ justifyContent: 'space-between', py: 1.5, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
          <span>CRONJOBS</span>
          <Box component="span" sx={{ color: 'success.main' }}>BEREIT &gt;</Box>
        </Button>
        <Typography color="text.secondary" sx={{ py: 1.5 }}>
          Abrufintervalle externer Schnittstellen planen und aktivieren.
        </Typography>
      </Box>
    </Stack>
  );
}
