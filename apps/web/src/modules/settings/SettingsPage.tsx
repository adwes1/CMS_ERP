import { Box, Button, Stack, Typography } from '@mui/material';

type SettingsPageProps = {
  items: Array<{
    label: string;
    route: string;
  }>;
  onOpen: (route: string) => void;
};

export function SettingsPage({ items, onOpen }: SettingsPageProps) {
  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / ADMINISTRATION</Typography>
        <Typography variant="h1">Einstellungen</Typography>
      </Box>

      <Box sx={{ borderTop: 1, borderColor: 'divider', maxWidth: 760 }}>
        {items.map((item) => (
          <Button
            key={item.route}
            onClick={() => onOpen(item.route)}
            fullWidth
            sx={{
              justifyContent: 'space-between',
              minHeight: 40,
              px: 1.5,
              py: 0.75,
              borderBottom: 1,
              borderColor: 'divider',
            }}
          >
            <span>{item.label}</span>
            <Box component="span" color="primary.main">&gt;</Box>
          </Button>
        ))}
      </Box>
    </Stack>
  );
}
