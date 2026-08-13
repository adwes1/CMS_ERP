import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  createExternalIntegration,
  deleteExternalIntegration,
  listExternalIntegrations,
  testExternalIntegration,
  updateExternalIntegration,
  type ExternalIntegration,
} from '../../api/client';

type Props = {
  canManage: boolean;
  onConfigureData: (id: string) => void;
  onImportCustomers: (id: string) => void;
  onImportArticles: (id: string) => void;
};

type IntegrationForm = {
  name: string;
  provider: 'SHOPWARE_6';
  baseUrl: string;
  clientId: string;
  clientSecret: string;
  active: boolean;
};

const emptyForm: IntegrationForm = {
  name: '',
  provider: 'SHOPWARE_6',
  baseUrl: '',
  clientId: '',
  clientSecret: '',
  active: true,
};

export function InterfacesPage({ canManage, onConfigureData, onImportCustomers, onImportArticles }: Props) {
  const [integrations, setIntegrations] = useState<ExternalIntegration[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<IntegrationForm>(emptyForm);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = async () => {
    if (!canManage) return;
    try {
      setIntegrations(await listExternalIntegrations());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Schnittstellen konnten nicht geladen werden.');
    }
  };

  useEffect(() => { void load(); }, [canManage]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (integration: ExternalIntegration) => {
    setEditingId(integration.id);
    setForm({
      name: integration.name,
      provider: integration.provider,
      baseUrl: integration.baseUrl,
      clientId: integration.clientId,
      clientSecret: '',
      active: integration.active,
    });
    setError(null);
    setDialogOpen(true);
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      if (editingId) {
        const payload = {
          name: form.name,
          baseUrl: form.baseUrl,
          clientId: form.clientId,
          clientSecret: form.clientSecret || undefined,
          active: form.active,
        };
        await updateExternalIntegration(editingId, payload);
      } else {
        await createExternalIntegration({ ...form, clientSecret: form.clientSecret });
      }
      setDialogOpen(false);
      setNotice(editingId ? 'Schnittstelle wurde aktualisiert.' : 'Schnittstelle wurde angelegt.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Schnittstelle konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const runTest = async (integration: ExternalIntegration) => {
    setBusyId(integration.id);
    setError(null);
    setNotice(null);
    try {
      const result = await testExternalIntegration(integration.id);
      setNotice(result.message);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Verbindungstest ist fehlgeschlagen.');
    } finally {
      setBusyId(null);
    }
  };

  const toggleActive = async (integration: ExternalIntegration) => {
    setBusyId(integration.id);
    setError(null);
    try {
      await updateExternalIntegration(integration.id, { active: !integration.active });
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Status konnte nicht geändert werden.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (integration: ExternalIntegration) => {
    setBusyId(integration.id);
    setError(null);
    try {
      await deleteExternalIntegration(integration.id);
      setNotice(`${integration.name} wurde gelöscht.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Schnittstelle konnte nicht gelöscht werden.');
    } finally {
      setBusyId(null);
    }
  };

  const formValid = form.name.trim() && form.baseUrl.trim() && form.clientId.trim() && (editingId || form.clientSecret);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / EINSTELLUNGEN / SCHNITTSTELLEN</Typography>
        <Typography variant="h1">Schnittstellen</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Externe Anbieter anbinden und technische Zugänge des Systems verwalten.
        </Typography>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {notice && <Alert severity="info" onClose={() => setNotice(null)}>{notice}</Alert>}
      {!canManage && <Alert severity="warning">Externe Schnittstellen sind nur für Administratoren sichtbar.</Alert>}

      {canManage && (
        <Box sx={{ maxWidth: 920 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'stretch', sm: 'center' }} gap={2} sx={{ mb: 1.5 }}>
            <Box>
              <Typography variant="h2">Externe Anbieter</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>Shops und weitere Dienste mit dem ERP verbinden.</Typography>
            </Box>
            <Button variant="contained" onClick={openCreate}>Anbieter anlegen</Button>
          </Stack>

          <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
            {integrations.map((integration) => (
              <Box key={integration.id} sx={{ py: 1.75, borderBottom: 1, borderColor: 'divider' }}>
                <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', md: 'center' }} gap={2}>
                  <Box sx={{ minWidth: 0 }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                      <Typography variant="h2">{integration.name}</Typography>
                      <Chip label={integration.active ? 'AKTIV' : 'INAKTIV'} color={integration.active ? 'success' : 'default'} size="small" variant="outlined" />
                      {integration.lastTestStatus && (
                        <Chip
                          label={integration.lastTestStatus === 'SUCCESS' ? 'VERBUNDEN' : 'FEHLER'}
                          color={integration.lastTestStatus === 'SUCCESS' ? 'success' : 'error'}
                          size="small"
                          variant="outlined"
                        />
                      )}
                      <Chip
                        label={integration.allowImport || integration.allowStockImport || integration.allowExport || integration.allowUpdate || integration.allowDelete ? 'DATENAUSTAUSCH FREIGEGEBEN' : 'DATEN GESPERRT'}
                        color={integration.allowImport || integration.allowStockImport || integration.allowExport || integration.allowUpdate || integration.allowDelete ? 'warning' : 'default'}
                        size="small"
                        variant="outlined"
                      />
                    </Stack>
                    <Typography color="primary.main" sx={{ overflowWrap: 'anywhere' }}>{integration.baseUrl}</Typography>
                    <Typography color="text.secondary" sx={{ mt: 0.5 }}>
                      Shopware 6 · Access-Key {integration.clientId}
                      {integration.lastTestedAt && ` · geprüft ${new Date(integration.lastTestedAt).toLocaleString('de-DE')}`}
                    </Typography>
                    {integration.lastTestMessage && <Typography color="text.secondary" sx={{ mt: 0.5 }}>{integration.lastTestMessage}</Typography>}
                  </Box>
                  <Stack direction="row" flexWrap="wrap" gap={1}>
                    <Button disabled={busyId === integration.id} onClick={() => void runTest(integration)}>Verbindung testen</Button>
                    <Button disabled={busyId === integration.id} onClick={() => onConfigureData(integration.id)}>Datenaustausch</Button>
                    <Button disabled={busyId === integration.id} onClick={() => onImportCustomers(integration.id)}>Kundenimport</Button>
                    <Button disabled={busyId === integration.id} onClick={() => onImportArticles(integration.id)}>Artikelimport</Button>
                    <Button disabled={busyId === integration.id} onClick={() => openEdit(integration)}>Bearbeiten</Button>
                    <Button color="warning" disabled={busyId === integration.id} onClick={() => void toggleActive(integration)}>
                      {integration.active ? 'Deaktivieren' : 'Aktivieren'}
                    </Button>
                    <Button color="error" disabled={busyId === integration.id} onClick={() => void remove(integration)}>Löschen</Button>
                  </Stack>
                </Stack>
              </Box>
            ))}
            {integrations.length === 0 && <Typography color="text.secondary" sx={{ py: 2 }}>Noch keine externen Anbieter angelegt.</Typography>}
          </Box>
        </Box>
      )}

      <Dialog open={dialogOpen} onClose={() => !saving && setDialogOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>{editingId ? 'Schnittstelle bearbeiten' : 'Externen Anbieter anlegen'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            <TextField select label="Anbieter" value={form.provider} onChange={(event) => setForm((current) => ({ ...current, provider: event.target.value as 'SHOPWARE_6' }))} disabled={saving || Boolean(editingId)}>
              <MenuItem value="SHOPWARE_6">Shopware 6</MenuItem>
            </TextField>
            <TextField label="Bezeichnung" placeholder="z. B. Shopware Hauptshop" value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} disabled={saving} />
            <TextField label="Shop-URL" placeholder="https://shop.example.com" value={form.baseUrl} onChange={(event) => setForm((current) => ({ ...current, baseUrl: event.target.value }))} disabled={saving} />
            <TextField label="Access-Key-ID" value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))} disabled={saving} />
            <TextField
              label="Secret-Access-Key"
              type="password"
              placeholder={editingId ? 'Leer lassen, um den vorhandenen Schlüssel zu behalten' : undefined}
              value={form.clientSecret}
              onChange={(event) => setForm((current) => ({ ...current, clientSecret: event.target.value }))}
              disabled={saving}
              helperText="Der Schlüssel wird verschlüsselt gespeichert und später nicht mehr angezeigt."
            />
            <FormControlLabel control={<Switch checked={form.active} onChange={(event) => setForm((current) => ({ ...current, active: event.target.checked }))} />} label="Schnittstelle aktiv" />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button color="warning" disabled={saving} onClick={() => setDialogOpen(false)}>Abbrechen</Button>
          <Button variant="contained" disabled={saving || !formValid} onClick={() => void save()}>Speichern</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
