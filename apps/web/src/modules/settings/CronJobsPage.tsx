import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, FormControlLabel, Stack, Switch, TextField, Typography } from '@mui/material';
import {
  listExternalIntegrations,
  updateIntegrationCronSettings,
  type ExternalIntegration,
} from '../../api/client';

type Props = { canManage: boolean };

function CronJobRow({ integration, onUpdated }: { integration: ExternalIntegration; onUpdated: (value: ExternalIntegration) => void }) {
  const [intervalMinutes, setIntervalMinutes] = useState(String(integration.cronIntervalMinutes));
  const [enabled, setEnabled] = useState(integration.cronEnabled);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const stockImportAllowed = integration.allowImport && integration.allowStockImport;
  const interval = Number(intervalMinutes);
  const validInterval = Number.isInteger(interval) && interval >= 1 && interval <= 10080;
  const canEnable = integration.active && stockImportAllowed;

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateIntegrationCronSettings(integration.id, {
        intervalMinutes: interval,
        enabled,
      });
      onUpdated(updated);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Cronjob konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ py: 2, borderBottom: 1, borderColor: 'divider' }}>
      <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" gap={2}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" alignItems="center" flexWrap="wrap" gap={1} sx={{ mb: 0.5 }}>
            <Typography variant="h2">{integration.name}</Typography>
            <Chip
              label={integration.cronEnabled ? 'CRONJOB AKTIV' : 'CRONJOB INAKTIV'}
              color={integration.cronEnabled ? 'success' : 'default'}
              size="small"
              variant="outlined"
            />
          </Stack>
          <Typography color="primary.main" sx={{ overflowWrap: 'anywhere' }}>{integration.baseUrl}</Typography>
          <Typography color="text.secondary" sx={{ mt: 0.5 }}>
            Shopware 6 · {stockImportAllowed ? 'Lagerbestandsimport freigegeben' : 'Lagerbestandsimport gesperrt'}
          </Typography>
          {integration.lastStockSyncAt && (
            <Typography color="text.secondary" sx={{ mt: 0.5 }}>
              Letzter Bestandsabruf: {new Date(integration.lastStockSyncAt).toLocaleString('de-DE')}
              {integration.lastStockSyncStatus ? ` · ${integration.lastStockSyncStatus}` : ''}
            </Typography>
          )}
          {integration.lastStockSyncMessage && (
            <Typography color={integration.lastStockSyncStatus === 'FAILED' ? 'error.main' : 'text.secondary'} sx={{ mt: 0.5 }}>
              {integration.lastStockSyncMessage}
            </Typography>
          )}
        </Box>

        <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} gap={1.5} sx={{ flexShrink: 0 }}>
          <TextField
            label="Abruf alle (Minuten)"
            type="number"
            value={intervalMinutes}
            disabled={saving}
            onChange={(event) => { setIntervalMinutes(event.target.value); setSaved(false); }}
            slotProps={{ htmlInput: { min: 1, max: 10080, step: 1 } }}
            sx={{ width: { sm: 190 } }}
          />
          <FormControlLabel
            label={enabled ? 'AKTIVIERT' : 'DEAKTIVIERT'}
            control={(
              <Switch
                checked={enabled}
                disabled={saving || (!enabled && !canEnable)}
                onChange={(event) => { setEnabled(event.target.checked); setSaved(false); }}
              />
            )}
            sx={{ m: 0 }}
          />
          <Button variant="contained" disabled={saving || !validInterval || (enabled && !canEnable)} onClick={() => void save()}>
            Speichern
          </Button>
        </Stack>
      </Stack>

      {!integration.active && <Typography color="warning.main" sx={{ mt: 1 }}>Die Schnittstelle ist deaktiviert. Der Cronjob kann nicht aktiviert werden.</Typography>}
      {integration.active && !stockImportAllowed && <Typography color="warning.main" sx={{ mt: 1 }}>Zuerst müssen unter Schnittstellen → Datenaustausch „Import erlauben“ und „Lagerbestand importieren“ freigegeben werden.</Typography>}
      {!validInterval && <Typography color="error.main" sx={{ mt: 1 }}>Das Intervall muss zwischen 1 und 10.080 Minuten liegen.</Typography>}
      {error && <Alert severity="error" sx={{ mt: 1.5 }}>{error}</Alert>}
      {saved && <Alert severity="success" sx={{ mt: 1.5 }}>Cronjob-Einstellungen wurden gespeichert.</Alert>}
    </Box>
  );
}

export function CronJobsPage({ canManage }: Props) {
  const [integrations, setIntegrations] = useState<ExternalIntegration[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) return;
    listExternalIntegrations().then(setIntegrations).catch((reason: Error) => setError(reason.message));
  }, [canManage]);

  const updateEntry = (updated: ExternalIntegration) => {
    setIntegrations((current) => current.map((entry) => entry.id === updated.id ? updated : entry));
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / EINSTELLUNGEN / CRONJOBS</Typography>
        <Typography variant="h1">Cronjobs</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Abrufintervalle für die automatische Aktualisierung der Shopware-Lagerbestände festlegen.
        </Typography>
      </Box>

      {!canManage && <Alert severity="warning">Cronjobs können nur von Administratoren verwaltet werden.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {canManage && (
        <Box sx={{ maxWidth: 1100 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Der Cronjob aktualisiert ausschließlich Lagerbestände eindeutig verknüpfter Shopware-Artikel. Er ist standardmäßig deaktiviert und arbeitet in Paketen zu je 25 Artikeln.
          </Alert>
          <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
            {integrations.map((integration) => (
              <CronJobRow key={integration.id} integration={integration} onUpdated={updateEntry} />
            ))}
            {integrations.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 2 }}>
                Noch keine Schnittstellen vorhanden. Lege zuerst unter „Schnittstellen“ einen Anbieter an.
              </Typography>
            )}
          </Box>
        </Box>
      )}
    </Stack>
  );
}
