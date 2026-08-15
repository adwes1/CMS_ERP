import { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  Typography,
} from '@mui/material';
import {
  createBackup,
  deleteBackup,
  downloadBackup,
  listBackups,
  restoreBackup,
  type BackupEntry,
} from '../../api/client';

type Props = { canManage: boolean };
type PendingAction = { type: 'restore' | 'delete'; backup: BackupEntry } | null;

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let value = bytes / 1024;
  let unit = units[0];
  for (let index = 1; index < units.length && value >= 1024; index += 1) {
    value /= 1024;
    unit = units[index];
  }
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${unit}`;
}

export function BackupPage({ canManage }: Props) {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [loading, setLoading] = useState(canManage);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setBackups(await listBackups());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Backups konnten nicht geladen werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) void load();
  }, [canManage]);

  const create = async () => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await createBackup();
      setBackups((current) => [created, ...current]);
      setSuccess('Das Backup wurde erfolgreich erstellt.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Backup konnte nicht erstellt werden.');
    } finally {
      setBusy(false);
    }
  };

  const download = async (backup: BackupEntry) => {
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      await downloadBackup(backup);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Backup konnte nicht heruntergeladen werden.');
    } finally {
      setBusy(false);
    }
  };

  const confirmAction = async () => {
    if (!pendingAction) return;
    const { type, backup } = pendingAction;
    setPendingAction(null);
    setBusy(true);
    setError(null);
    setSuccess(null);
    try {
      if (type === 'restore') {
        await restoreBackup(backup.id);
        setSuccess('Das Backup wurde erfolgreich wiederhergestellt.');
      } else {
        await deleteBackup(backup.id);
        setBackups((current) => current.filter((entry) => entry.id !== backup.id));
        setSuccess('Das Backup wurde gelöscht.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Backup konnte nicht ${type === 'restore' ? 'wiederhergestellt' : 'gelöscht'} werden.`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / EINSTELLUNGEN / BACKUP</Typography>
        <Typography variant="h1">Backup</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Datensicherungen der Datenbank und der damit verknüpften Dateien verwalten.
        </Typography>
      </Box>

      {!canManage && <Alert severity="warning">Backups können nur von Administratoren verwaltet werden.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      {success && <Alert severity="success">{success}</Alert>}

      {canManage && (
        <Box sx={{ maxWidth: 1100 }}>
          <Alert severity="info" sx={{ mb: 2 }}>
            Gesichert werden die vollständige Datenbank und alle verknüpften Artikeldateien. System- und Programmdateien sind nicht Bestandteil des ZIP-Backups.
          </Alert>

          <Stack direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} justifyContent="space-between" gap={2} sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h2">BACKUPS</Typography>
              <Typography color="text.secondary" sx={{ mt: 0.5 }}>Manuell erstellte Datensicherungen</Typography>
            </Box>
            <Button variant="contained" disabled={busy} onClick={() => void create()}>
              {busy ? 'Vorgang läuft …' : 'Backup erstellen'}
            </Button>
          </Stack>

          <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
            <Box sx={{ display: { xs: 'none', md: 'grid' }, gridTemplateColumns: '1fr 160px minmax(360px, auto)', gap: 2, py: 1, borderBottom: 1, borderColor: 'divider' }}>
              <Typography variant="overline" color="text.secondary">DATUM / UHRZEIT</Typography>
              <Typography variant="overline" color="text.secondary">GRÖSSE</Typography>
              <Typography variant="overline" color="text.secondary" textAlign="right">AKTIONEN</Typography>
            </Box>

            {loading && (
              <Stack direction="row" alignItems="center" gap={1.5} sx={{ py: 3 }}>
                <CircularProgress size={18} />
                <Typography color="text.secondary">Backups werden geladen …</Typography>
              </Stack>
            )}

            {!loading && backups.map((backup) => (
              <Box key={backup.id} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 160px minmax(360px, auto)' }, alignItems: 'center', gap: { xs: 1, md: 2 }, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
                <Box>
                  <Typography>{new Date(backup.createdAt).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'medium' })}</Typography>
                  <Typography color="text.secondary" sx={{ display: { md: 'none' }, mt: 0.25 }}>{formatSize(backup.sizeBytes)}</Typography>
                </Box>
                <Typography sx={{ display: { xs: 'none', md: 'block' } }}>{formatSize(backup.sizeBytes)}</Typography>
                <Stack direction="row" justifyContent={{ xs: 'flex-start', md: 'flex-end' }} flexWrap="wrap" gap={0.5}>
                  <Button disabled={busy} onClick={() => void download(backup)}>Herunterladen</Button>
                  <Button color="warning" disabled={busy} onClick={() => setPendingAction({ type: 'restore', backup })}>Einspielen</Button>
                  <Button color="error" disabled={busy} onClick={() => setPendingAction({ type: 'delete', backup })}>Löschen</Button>
                </Stack>
              </Box>
            ))}

            {!loading && backups.length === 0 && (
              <Typography color="text.secondary" sx={{ py: 3 }}>Noch keine Backups vorhanden.</Typography>
            )}
          </Box>
        </Box>
      )}

      <Dialog open={Boolean(pendingAction)} onClose={() => !busy && setPendingAction(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{pendingAction?.type === 'restore' ? 'Backup einspielen?' : 'Backup löschen?'}</DialogTitle>
        <DialogContent>
          <Typography color="text.secondary">
            {pendingAction?.type === 'restore'
              ? 'Die aktuelle Datenbank und die verknüpften Artikeldateien werden durch den Stand dieses Backups ersetzt. Dieser Vorgang kann nicht rückgängig gemacht werden.'
              : 'Das ZIP-Backup wird dauerhaft gelöscht. Dieser Vorgang kann nicht rückgängig gemacht werden.'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button disabled={busy} onClick={() => setPendingAction(null)}>Abbrechen</Button>
          <Button
            variant="contained"
            color={pendingAction?.type === 'restore' ? 'warning' : 'error'}
            disabled={busy}
            onClick={() => void confirmAction()}
          >
            {pendingAction?.type === 'restore' ? 'Jetzt einspielen' : 'Endgültig löschen'}
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
