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
  LinearProgress,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  getExternalIntegration,
  getLatestCustomerImport,
  previewCustomerImport,
  processNextCustomerImportBatch,
  startCustomerImport,
  type CustomerImportJob,
  type CustomerImportPreview,
  type ExternalIntegration,
} from '../../api/client';

type Props = {
  integrationId: string;
  canManage: boolean;
  onBack: () => void;
  onOpenDataExchange: () => void;
  onOpenArticleImport: () => void;
};

const statusLabel = {
  READY: 'BEREIT',
  ALREADY_IMPORTED: 'BEREITS IMPORTIERT',
  DUPLICATE: 'DUBLETTE',
} as const;

export function CustomerImportPage({ integrationId, canManage, onBack, onOpenDataExchange, onOpenArticleImport }: Props) {
  const [integration, setIntegration] = useState<ExternalIntegration | null>(null);
  const [preview, setPreview] = useState<CustomerImportPreview | null>(null);
  const [job, setJob] = useState<CustomerImportJob | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!canManage) return;
    Promise.all([getExternalIntegration(integrationId), getLatestCustomerImport(integrationId)])
      .then(([integrationValue, jobValue]) => {
        setIntegration(integrationValue);
        setJob(jobValue);
      })
      .catch((reason: Error) => setError(reason.message));
  }, [canManage, integrationId]);

  const loadPreview = async () => {
    setLoadingPreview(true);
    setError(null);
    try {
      setPreview(await previewCustomerImport(integrationId));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Vorschau konnte nicht geladen werden.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const runImport = async () => {
    setImporting(true);
    setError(null);
    setPreview(null);
    try {
      let current = await startCustomerImport(integrationId);
      setJob(current);
      while (current.status !== 'COMPLETED') {
        current = await processNextCustomerImportBatch(integrationId, current.id);
        setJob(current);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Kundenimport wurde unterbrochen.');
    } finally {
      setImporting(false);
    }
  };

  const progress = job?.total ? Math.min(100, (job.processed / job.total) * 100) : 0;
  const canPreview = Boolean(integration?.active && integration.allowImport && integration.lastTestStatus === 'SUCCESS');

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / EINSTELLUNGEN / SCHNITTSTELLEN / KUNDENIMPORT</Typography>
        <Typography variant="h1">{integration?.name ?? 'Kundenimport'}</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Bestehende Kunden einmalig und kontrolliert aus Shopware übernehmen.
        </Typography>
      </Box>

      <Stack direction="row" spacing={1} sx={{ maxWidth: 920, borderBottom: 1, borderColor: 'divider' }}>
        <Button onClick={onBack}>Verbindung</Button>
        <Button onClick={onOpenDataExchange}>Datenaustausch</Button>
        <Button aria-current="page" sx={{ color: 'primary.main', borderBottom: 2, borderColor: 'primary.main' }}>Kundenimport</Button>
        <Button onClick={onOpenArticleImport}>Artikelimport</Button>
      </Stack>

      {!canManage && <Alert severity="warning">Der Kundenimport ist nur für Administratoren verfügbar.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {canManage && integration && (
        <Box sx={{ maxWidth: 1000 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Die Vorschau liest höchstens 10 Kunden und speichert nichts. Der bestätigte Import arbeitet anschließend in Paketen zu je 25 Datensätzen.
          </Alert>

          {!integration.allowImport && <Alert severity="warning" sx={{ mb: 2 }}>Der Import ist unter „Datenaustausch“ noch nicht freigegeben.</Alert>}
          {(!integration.active || integration.lastTestStatus !== 'SUCCESS') && (
            <Alert severity="warning" sx={{ mb: 2 }}>Die Schnittstelle muss aktiv und erfolgreich getestet sein.</Alert>
          )}

          <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '200px 1fr' }, gap: '9px 24px', m: 0, py: 2, borderTop: 1, borderBottom: 1, borderColor: 'divider' }}>
            <Typography component="dt" color="text.secondary">QUELLE</Typography>
            <Typography component="dd" sx={{ m: 0 }}>{integration.baseUrl}</Typography>
            <Typography component="dt" color="text.secondary">ZIEL</Typography>
            <Typography component="dd" sx={{ m: 0 }}>CMS ERP → Adressen → Kunden</Typography>
            <Typography component="dt" color="text.secondary">DUBLETTEN</Typography>
            <Typography component="dd" sx={{ m: 0 }}>Werden erkannt und übersprungen; vorhandene Kunden werden nicht verändert.</Typography>
            <Typography component="dt" color="text.secondary">SHOPWARE-DATEN</Typography>
            <Typography component="dd" sx={{ m: 0 }}>Nur lesender Zugriff; im Shop wird nichts verändert oder gelöscht.</Typography>
          </Box>

          {job && (
            <Box sx={{ mt: 2, py: 2, borderBottom: 1, borderColor: 'divider' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" gap={2} sx={{ mb: 1 }}>
                <Typography variant="h2">Letzter Importlauf</Typography>
                <Chip label={job.status === 'COMPLETED' ? 'ABGESCHLOSSEN' : importing ? 'LÄUFT' : 'UNTERBROCHEN'} color={job.status === 'COMPLETED' ? 'success' : 'warning'} size="small" variant="outlined" />
              </Stack>
              <LinearProgress variant="determinate" value={job.status === 'COMPLETED' ? 100 : progress} sx={{ mb: 1.5 }} />
              <Stack direction="row" flexWrap="wrap" gap={2}>
                <Typography color="text.secondary">Verarbeitet: <Box component="span" color="text.primary">{job.processed} / {job.total || '?'}</Box></Typography>
                <Typography color="text.secondary">Importiert: <Box component="span" color="success.main">{job.imported}</Box></Typography>
                <Typography color="text.secondary">Übersprungen: <Box component="span" color="warning.main">{job.skipped}</Box></Typography>
                <Typography color="text.secondary">Fehler: <Box component="span" color={job.failed ? 'error.main' : 'text.primary'}>{job.failed}</Box></Typography>
              </Stack>
            </Box>
          )}

          <Button variant="contained" disabled={!canPreview || loadingPreview || importing} onClick={() => void loadPreview()} sx={{ mt: 2 }}>
            {loadingPreview ? 'Vorschau wird geladen …' : 'Testimport / Vorschau laden'}
          </Button>
        </Box>
      )}

      <Dialog open={Boolean(preview)} onClose={() => !importing && setPreview(null)} fullWidth maxWidth="lg">
        <DialogTitle>Testimport / Vorschau</DialogTitle>
        <DialogContent>
          {preview && (
            <Stack spacing={2}>
              <Alert severity="success">Keine Daten wurden gespeichert oder verändert. Shopware meldet insgesamt {preview.total} Kunden.</Alert>
              <TableContainer sx={{ border: 1, borderColor: 'divider' }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Status</TableCell>
                      <TableCell>Kundennummer</TableCell>
                      <TableCell>Name / Firma</TableCell>
                      <TableCell>E-Mail</TableCell>
                      <TableCell>Ort</TableCell>
                      <TableCell>Lieferadresse</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {preview.customers.map((customer) => (
                      <TableRow key={customer.externalId}>
                        <TableCell>
                          <Chip label={statusLabel[customer.status]} color={customer.status === 'READY' ? 'success' : 'warning'} size="small" variant="outlined" />
                        </TableCell>
                        <TableCell>{customer.customerNumber || '–'}</TableCell>
                        <TableCell>{customer.company || `${customer.firstName} ${customer.lastName}`.trim() || '–'}</TableCell>
                        <TableCell>{customer.email || '–'}</TableCell>
                        <TableCell>{[customer.postalCode, customer.city].filter(Boolean).join(' ') || '–'}</TableCell>
                        <TableCell>{customer.separateDeliveryAddress ? 'ABWEICHEND' : 'WIE RECHNUNGSADRESSE'}</TableCell>
                      </TableRow>
                    ))}
                    {preview.customers.length === 0 && <TableRow><TableCell colSpan={6}>Keine Kunden in Shopware vorhanden.</TableCell></TableRow>}
                  </TableBody>
                </Table>
              </TableContainer>
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button color="warning" disabled={importing} onClick={() => setPreview(null)}>Abbrechen</Button>
          <Button variant="contained" disabled={importing || !preview?.customers.length} onClick={() => void runImport()}>
            Import bestätigen und starten
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
