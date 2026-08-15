import { useEffect, useState } from 'react';
import { Alert, Box, Button, CircularProgress, Stack, Typography } from '@mui/material';
import { getSystemUpdateStatus, type SystemUpdateStatus } from '../../api/client';

type Props = { canManage: boolean };

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes < 0) return '–';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toLocaleString('de-DE', { maximumFractionDigits: 2 })} ${units[index]}`;
}

function detailValue(key: string, value: string | number) {
  if (typeof value === 'number' && key.toLowerCase().includes('bytes')) return formatBytes(value);
  return typeof value === 'number' ? value.toLocaleString('de-DE') : value;
}

export function UpdatePage({ canManage }: Props) {
  const [status, setStatus] = useState<SystemUpdateStatus | null>(null);
  const [loading, setLoading] = useState(canManage);
  const [error, setError] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      setStatus(await getSystemUpdateStatus());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Systemprüfung konnte nicht ausgeführt werden.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (canManage) void load();
  }, [canManage]);

  const versionAlert = status?.version.status === 'current'
    ? { severity: 'success' as const, text: 'Ihre Version ist aktuell.' }
    : status?.version.status === 'update_available'
      ? { severity: 'warning' as const, text: 'Eine neuere, erfolgreich gebaute Version ist auf GitHub verfügbar.' }
      : status?.version.currentCommit === 'development'
        ? { severity: 'info' as const, text: 'Lokaler Entwicklungsstand: Eine eindeutige GitHub-Versionskennung ist erst in den über GitHub gebauten Images enthalten.' }
        : { severity: 'info' as const, text: 'Der Versionsstand konnte nicht eindeutig mit GitHub verglichen werden.' };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / EINSTELLUNGEN / UPDATE</Typography>
        <Typography variant="h1">Update</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Versionsstand und technische Voraussetzungen für Aktualisierungen kontrollieren.
        </Typography>
      </Box>

      {!canManage && <Alert severity="warning">Die Update- und Systemprüfung ist nur für Administratoren verfügbar.</Alert>}
      {error && <Alert severity="error">{error}</Alert>}

      {canManage && loading && (
        <Stack direction="row" alignItems="center" gap={1.5} sx={{ py: 2 }}>
          <CircularProgress size={20} />
          <Typography color="text.secondary">Version und System werden geprüft …</Typography>
        </Stack>
      )}

      {canManage && status && !loading && (
        <Stack spacing={3} sx={{ maxWidth: 1100 }}>
          <Box>
            <Alert severity={versionAlert.severity}>{versionAlert.text}</Alert>
            <Box sx={{ mt: 1.5, borderTop: 1, borderColor: 'divider' }}>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' }, gap: 1, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
                <Typography color="text.secondary">INSTALLIERTE VERSION</Typography>
                <Typography>{status.version.currentVersion} · {status.version.currentCommit.slice(0, 12)}</Typography>
              </Box>
              <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' }, gap: 1, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
                <Typography color="text.secondary">GITHUB / {status.version.branch.toUpperCase()}</Typography>
                <Typography>{status.version.latestCommit?.slice(0, 12) ?? 'Nicht verfügbar'}</Typography>
              </Box>
              {status.version.latestPublishedAt && (
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '220px 1fr' }, gap: 1, py: 1.25, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography color="text.secondary">LETZTE ÄNDERUNG</Typography>
                  <Typography>{new Date(status.version.latestPublishedAt).toLocaleString('de-DE')}</Typography>
                </Box>
              )}
            </Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} gap={1} sx={{ mt: 1.5 }}>
              <Button variant="contained" onClick={() => void load()}>Erneut prüfen</Button>
              <Button component="a" href={status.version.latestUrl ?? status.version.repositoryUrl} target="_blank" rel="noreferrer">
                GitHub öffnen
              </Button>
            </Stack>
          </Box>

          <Box>
            <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1} sx={{ mb: 1 }}>
              <Typography variant="h2">SYSTEMPRÜFUNGEN</Typography>
              <Typography color={status.systemReady ? 'success.main' : 'error.main'}>
                {status.systemReady ? '● SYSTEM BEREIT' : '● PRÜFUNG FEHLGESCHLAGEN'}
              </Typography>
            </Stack>
            <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
              {status.checks.map((check) => (
                <Box key={check.id} sx={{ py: 1.5, borderBottom: 1, borderColor: 'divider' }}>
                  <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={1}>
                    <Box>
                      <Typography>{check.label}</Typography>
                      <Typography color="text.secondary" sx={{ mt: 0.35 }}>{check.message}</Typography>
                    </Box>
                    <Typography color={check.status === 'ok' ? 'success.main' : check.status === 'warning' ? 'warning.main' : 'error.main'} sx={{ flexShrink: 0 }}>
                      {check.status === 'ok' ? 'OK' : check.status === 'warning' ? 'WARNUNG' : 'FEHLER'}
                    </Typography>
                  </Stack>
                  {check.details && (
                    <Stack direction="row" flexWrap="wrap" gap={2} sx={{ mt: 0.75 }}>
                      {Object.entries(check.details).map(([key, value]) => (
                        <Typography key={key} variant="caption" color="text.secondary">
                          {key.toUpperCase()}: {detailValue(key, value)}
                        </Typography>
                      ))}
                    </Stack>
                  )}
                </Box>
              ))}
            </Box>
          </Box>

          <Alert severity="info">
            Aktualisierungen werden ausschließlich über GitHub und das erneute Laden des Docker-Stacks installiert. Beim Start der neuen API-Version werden ausstehende Datenbankmigrationen automatisch angewendet; die persistenten Datenverzeichnisse bleiben erhalten.
          </Alert>
        </Stack>
      )}
    </Stack>
  );
}
