import { useEffect, useState } from 'react';
import { Alert, Box, Button, FormControlLabel, Stack, Switch, Typography } from '@mui/material';
import {
  getExternalIntegration,
  updateIntegrationDataPermissions,
  type ExternalIntegration,
  type IntegrationDataPermissions,
} from '../../api/client';

type Props = {
  integrationId: string;
  canManage: boolean;
  onBack: () => void;
  onOpenCustomerImport: () => void;
  onOpenArticleImport: () => void;
};

const blockedPermissions: IntegrationDataPermissions = {
  allowImport: false,
  allowStockImport: false,
  allowExport: false,
  allowUpdate: false,
  allowDelete: false,
};

const permissionRows: Array<{
  key: keyof IntegrationDataPermissions;
  label: string;
  description: string;
  color?: 'error';
}> = [
  {
    key: 'allowImport',
    label: 'Import erlauben',
    description: 'Daten vom externen Anbieter in das CMS ERP übernehmen.',
  },
  {
    key: 'allowStockImport',
    label: 'Lagerbestand importieren',
    description: 'Startbestand beim Artikelimport übernehmen und laufende Bestände über den aktivierten Cronjob aktualisieren.',
  },
  {
    key: 'allowExport',
    label: 'Export erlauben',
    description: 'Daten aus dem CMS ERP an den externen Anbieter übertragen.',
  },
  {
    key: 'allowUpdate',
    label: 'Änderungen erlauben',
    description: 'Bereits vorhandene Daten über die Schnittstelle aktualisieren.',
  },
  {
    key: 'allowDelete',
    label: 'Löschen erlauben',
    description: 'Daten über die Schnittstelle löschen. Diese Freigabe ist besonders kritisch.',
    color: 'error',
  },
];

export function InterfaceDataExchangePage({ integrationId, canManage, onBack, onOpenCustomerImport, onOpenArticleImport }: Props) {
  const [integration, setIntegration] = useState<ExternalIntegration | null>(null);
  const [permissions, setPermissions] = useState<IntegrationDataPermissions>(blockedPermissions);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!canManage) return;
    getExternalIntegration(integrationId)
      .then((value) => {
        setIntegration(value);
        setPermissions({
          allowImport: value.allowImport,
          allowStockImport: value.allowStockImport,
          allowExport: value.allowExport,
          allowUpdate: value.allowUpdate,
          allowDelete: value.allowDelete,
        });
      })
      .catch((reason: Error) => setError(reason.message));
  }, [canManage, integrationId]);

  const save = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const updated = await updateIntegrationDataPermissions(integrationId, permissions);
      setIntegration(updated);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Freigaben konnten nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const blockAll = () => {
    setPermissions(blockedPermissions);
    setSaved(false);
  };

  const hasPermission = Object.values(permissions).some(Boolean);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / EINSTELLUNGEN / SCHNITTSTELLEN / DATENAUSTAUSCH</Typography>
        <Typography variant="h1">{integration?.name ?? 'Datenaustausch'}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Festlegen, welche Datenaktionen diese Schnittstelle ausführen darf.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ maxWidth: 920, borderBottom: 1, borderColor: 'divider' }}>
        <Button onClick={onBack}>Verbindung</Button>
        <Button aria-current="page" sx={{ color: 'primary.main', borderBottom: 2, borderColor: 'primary.main' }}>Datenaustausch</Button>
        <Button onClick={onOpenCustomerImport}>Kundenimport</Button>
        <Button onClick={onOpenArticleImport}>Artikelimport</Button>
      </Stack>

      {!canManage && <Alert severity="warning">Diese Einstellungen sind nur für Administratoren verfügbar.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {saved && <Alert severity="success">Die Freigaben wurden gespeichert.</Alert>}

      {canManage && integration && (
        <Box sx={{ maxWidth: 920 }}>
          <Alert severity={hasPermission ? 'warning' : 'success'} sx={{ mb: 2 }}>
            {hasPermission
              ? 'Für diese Schnittstelle ist mindestens eine Datenaktion freigegeben.'
              : 'Sicherer Standard: Es dürfen keine Daten importiert, exportiert, geändert oder gelöscht werden.'}
          </Alert>

          <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '180px 1fr' }, gap: '8px 24px', m: 0, mb: 2 }}>
            <Typography component="dt" color="text.secondary">ANBIETER</Typography>
            <Typography component="dd" sx={{ m: 0 }}>Shopware 6</Typography>
            <Typography component="dt" color="text.secondary">SHOP-URL</Typography>
            <Typography component="dd" sx={{ m: 0, overflowWrap: 'anywhere' }}>{integration.baseUrl}</Typography>
            <Typography component="dt" color="text.secondary">VERBINDUNGSTEST</Typography>
            <Typography component="dd" sx={{ m: 0 }}>Nur Authentifizierung, kein Zugriff auf Shopdaten</Typography>
          </Box>

          <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
            {permissionRows.map((row) => (
              <Stack
                key={row.key}
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                alignItems={{ xs: 'stretch', sm: 'center' }}
                gap={1}
                sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}
              >
                <Box>
                  <Typography color={row.color ? `${row.color}.main` : 'text.primary'}>{row.label}</Typography>
                  <Typography color="text.secondary" sx={{ mt: 0.4 }}>{row.description}</Typography>
                </Box>
                <FormControlLabel
                  label={permissions[row.key] ? 'ERLAUBT' : 'GESPERRT'}
                  labelPlacement="start"
                  control={(
                    <Switch
                      color={row.color ?? 'primary'}
                      checked={permissions[row.key]}
                      disabled={saving || (row.key === 'allowStockImport' && !permissions.allowImport)}
                      onChange={(event) => {
                        setPermissions((current) => ({
                          ...current,
                          [row.key]: event.target.checked,
                          ...(row.key === 'allowImport' && !event.target.checked ? { allowStockImport: false } : {}),
                        }));
                        setSaved(false);
                      }}
                    />
                  )}
                  sx={{ m: 0, flexShrink: 0 }}
                />
              </Stack>
            ))}
          </Box>

          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1.5} sx={{ mt: 2 }}>
            <Button color="warning" disabled={saving || !hasPermission} onClick={blockAll}>Alles sperren</Button>
            <Button variant="contained" disabled={saving} onClick={() => void save()}>Freigaben speichern</Button>
          </Stack>
        </Box>
      )}
    </Stack>
  );
}
