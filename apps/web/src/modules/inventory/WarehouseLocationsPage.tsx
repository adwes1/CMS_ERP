import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { CloseOutlined, DeleteOutline, SaveOutlined } from '@mui/icons-material';
import {
  createWarehouseLocation,
  deleteWarehouseLocation,
  listWarehouseLocations,
  updateWarehouseLocation,
  type WarehouseLocation,
  type WarehouseLocationInput,
} from '../../api/client';

const emptyForm: WarehouseLocationInput = {
  location: '', shelf: '', position: '', maxWeight: '', length: '', width: '', depth: '',
};

const sortLocations = (values: WarehouseLocation[]) => [...values].sort((a, b) =>
  a.location.localeCompare(b.location, 'de', { numeric: true })
  || a.shelf.localeCompare(b.shelf, 'de', { numeric: true })
  || a.position.localeCompare(b.position, 'de', { numeric: true }),
);

export function WarehouseLocationsPage() {
  const [locations, setLocations] = useState<WarehouseLocation[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<WarehouseLocationInput>(emptyForm);
  const [editing, setEditing] = useState<WarehouseLocation | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    listWarehouseLocations()
      .then((result) => setLocations(sortLocations(result)))
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredLocations = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase('de');
    if (!term) return locations;
    return locations.filter((entry) =>
      [entry.location, entry.shelf, entry.position].join(' ').toLocaleLowerCase('de').includes(term),
    );
  }, [deferredSearch, locations]);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
    setOpen(true);
  };

  const startEdit = (entry: WarehouseLocation) => {
    setEditing(entry);
    setForm({
      location: entry.location,
      shelf: entry.shelf,
      position: entry.position,
      maxWeight: entry.maxWeight ?? '',
      length: entry.length ?? '',
      width: entry.width ?? '',
      depth: entry.depth ?? '',
    });
    setError(null);
    setOpen(true);
  };

  const close = () => {
    if (!saving) setOpen(false);
  };

  const save = async () => {
    const input = {
      location: form.location.trim(),
      shelf: form.shelf.trim(),
      position: form.position.trim(),
      maxWeight: form.maxWeight?.trim() || undefined,
      length: form.length?.trim() || undefined,
      width: form.width?.trim() || undefined,
      depth: form.depth?.trim() || undefined,
    };
    if (!input.location || !input.shelf || !input.position) {
      setError('Bitte Ort, Regal und Platz vollständig angeben.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = editing
        ? await updateWarehouseLocation(editing.id, input)
        : await createWarehouseLocation(input);
      setLocations((current) => sortLocations(editing
        ? current.map((entry) => entry.id === saved.id ? saved : entry)
        : [...current, saved]));
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Lagerplatz konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: WarehouseLocation) => {
    if (!window.confirm(`Lagerplatz ${entry.location} / ${entry.shelf} / ${entry.position} wirklich löschen?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteWarehouseLocation(entry.id);
      setLocations((current) => current.filter((item) => item.id !== entry.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Lagerplatz konnte nicht gelöscht werden.');
    } finally {
      setSaving(false);
    }
  };

  const complete = Boolean(form.location.trim() && form.shelf.trim() && form.position.trim());

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto minmax(0, 1fr)', md: 'auto minmax(280px, 1fr) auto' }, gap: 1.5, alignItems: 'center' }}>
        <Typography variant="h1" sx={{ whiteSpace: 'nowrap' }}>Lagerplätze</Typography>
        <TextField
          fullWidth
          size="small"
          label="Lagerplätze durchsuchen"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button variant="contained" onClick={startCreate} sx={{ whiteSpace: 'nowrap', px: 2.5, gridColumn: { xs: '1 / -1', md: 'auto' } }}>
          Lagerplatz anlegen
        </Button>
      </Box>

      {error && !open && <Alert severity="error">{error}</Alert>}

      <Box>
        <Typography variant="overline" color="text.secondary">
          {loading ? 'LAGERPLÄTZE WERDEN GELADEN' : `${filteredLocations.length} VON ${locations.length} LAGERPLÄTZEN`}
        </Typography>
        <TableContainer sx={{ mt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Table size="small" aria-label="Lagerplätze" sx={{ minWidth: 560 }}>
            <TableHead>
              <TableRow>
                <TableCell>ORT</TableCell>
                <TableCell>REGAL</TableCell>
                <TableCell>PLATZ</TableCell>
                <TableCell align="right">AKTIONEN</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredLocations.map((entry) => (
                <TableRow
                  key={entry.id}
                  hover
                  role="button"
                  tabIndex={0}
                  onClick={() => startEdit(entry)}
                  onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && startEdit(entry)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ color: 'primary.main' }}>{entry.location}</TableCell>
                  <TableCell>{entry.shelf}</TableCell>
                  <TableCell>{entry.position}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Löschen">
                      <IconButton
                        aria-label="Lagerplatz löschen"
                        color="error"
                        size="small"
                        disabled={saving}
                        onClick={(event) => { event.stopPropagation(); void remove(entry); }}
                      >
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && filteredLocations.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} sx={{ py: 4, color: 'text.secondary' }}>
                    {search.trim() ? 'Keine passenden Lagerplätze gefunden.' : 'Noch keine Lagerplätze vorhanden.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={open} onClose={close} fullWidth maxWidth="sm">
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            {editing ? `LAGERPLATZ ${editing.location} / ${editing.shelf} / ${editing.position}` : 'LAGERPLATZ ANLEGEN'}
          </Box>
          <Tooltip title="Speichern">
            <span>
              <IconButton color="primary" aria-label="Lagerplatz speichern" onClick={() => void save()} disabled={saving || !complete}>
                <SaveOutlined />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Abbrechen">
            <span>
              <IconButton color="warning" aria-label="Bearbeitung abbrechen" onClick={close} disabled={saving}>
                <CloseOutlined />
              </IconButton>
            </span>
          </Tooltip>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            <TextField
              autoFocus
              required
              label="Ort"
              placeholder="z. B. Hauptlager"
              value={form.location}
              disabled={saving}
              onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))}
            />
            <TextField
              required
              label="Regal"
              placeholder="z. B. A-01"
              value={form.shelf}
              disabled={saving}
              onChange={(event) => setForm((current) => ({ ...current, shelf: event.target.value }))}
            />
            <TextField
              required
              label="Platz"
              placeholder="z. B. 03"
              value={form.position}
              disabled={saving}
              onChange={(event) => setForm((current) => ({ ...current, position: event.target.value }))}
            />
            <Typography variant="overline" color="text.secondary">OPTIONALE PLATZDATEN</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' }, gap: 2 }}>
              <TextField
                type="number"
                label="Maximalgewicht (kg)"
                value={form.maxWeight ?? ''}
                disabled={saving}
                slotProps={{ htmlInput: { min: 0.001, step: 0.001 } }}
                onChange={(event) => setForm((current) => ({ ...current, maxWeight: event.target.value }))}
              />
              <TextField
                type="number"
                label="Länge (cm)"
                value={form.length ?? ''}
                disabled={saving}
                slotProps={{ htmlInput: { min: 0.001, step: 0.001 } }}
                onChange={(event) => setForm((current) => ({ ...current, length: event.target.value }))}
              />
              <TextField
                type="number"
                label="Breite (cm)"
                value={form.width ?? ''}
                disabled={saving}
                slotProps={{ htmlInput: { min: 0.001, step: 0.001 } }}
                onChange={(event) => setForm((current) => ({ ...current, width: event.target.value }))}
              />
              <TextField
                type="number"
                label="Tiefe (cm)"
                value={form.depth ?? ''}
                disabled={saving}
                slotProps={{ htmlInput: { min: 0.001, step: 0.001 } }}
                onChange={(event) => setForm((current) => ({ ...current, depth: event.target.value }))}
                onKeyDown={(event) => event.key === 'Enter' && complete && void save()}
              />
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
