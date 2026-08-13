import { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import {
  createSpecification,
  deleteSpecification,
  listSpecifications,
  type Specification,
} from '../../api/client';

type Props = { canManage: boolean };

export function SpecificationsPage({ canManage }: Props) {
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listSpecifications().then(setSpecifications).catch((reason: Error) => setError(reason.message));
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createSpecification(name);
      setSpecifications((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'de')));
      setName('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Spezifikation konnte nicht angelegt werden.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (specification: Specification) => {
    setSaving(true);
    setError(null);
    try {
      await deleteSpecification(specification.id);
      setSpecifications((current) => current.filter((entry) => entry.id !== specification.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Spezifikation konnte nicht gelöscht werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / EINSTELLUNGEN</Typography>
        <Typography variant="h1">Spezifikationen</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Quellen und Projektnamen für die Zuordnung von Adressen verwalten.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {!canManage && <Alert severity="warning">Änderungen sind nur für Administratoren möglich.</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ maxWidth: 680 }}>
        <TextField
          fullWidth
          size="small"
          label="Neue Spezifikation"
          value={name}
          disabled={!canManage || saving}
          onChange={(event) => setName(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && void add()}
        />
        <Button variant="contained" disabled={!canManage || saving || !name.trim()} onClick={() => void add()} sx={{ whiteSpace: 'nowrap' }}>
          Anlegen
        </Button>
      </Stack>

      <Box sx={{ maxWidth: 680, borderTop: 1, borderColor: 'divider' }}>
        {specifications.map((specification) => (
          <Stack key={specification.id} direction="row" alignItems="center" spacing={2} sx={{ minHeight: 46, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ flexGrow: 1 }}>{specification.name}</Typography>
            <Button color="error" disabled={!canManage || saving} onClick={() => void remove(specification)}>Löschen</Button>
          </Stack>
        ))}
        {specifications.length === 0 && <Typography color="text.secondary" sx={{ py: 2 }}>Keine Spezifikationen vorhanden.</Typography>}
      </Box>
    </Stack>
  );
}
