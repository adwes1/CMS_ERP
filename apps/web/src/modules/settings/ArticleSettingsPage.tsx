import { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography } from '@mui/material';
import {
  createArticleUnit,
  deleteArticleUnit,
  listArticleTypeSettings,
  listArticleUnits,
  updateArticleTypeSetting,
  updateArticleUnit,
  type ArticleTypeSetting,
  type ArticleUnit,
} from '../../api/client';

type Props = { canManage: boolean };

export function ArticleSettingsPage({ canManage }: Props) {
  const [units, setUnits] = useState<ArticleUnit[]>([]);
  const [articleTypes, setArticleTypes] = useState<ArticleTypeSetting[]>([]);
  const [name, setName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([listArticleUnits(), listArticleTypeSettings()])
      .then(([loadedUnits, loadedArticleTypes]) => {
        setUnits(loadedUnits);
        setArticleTypes(loadedArticleTypes);
      })
      .catch((reason: Error) => setError(reason.message));
  }, []);

  const sortUnits = (values: ArticleUnit[]) => values.sort((a, b) => a.name.localeCompare(b.name, 'de'));

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createArticleUnit(name);
      setUnits((current) => sortUnits([...current, created]));
      setName('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Einheit konnte nicht angelegt werden.');
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (unit: ArticleUnit) => {
    setEditingId(unit.id);
    setEditingName(unit.name);
    setError(null);
  };

  const saveEdit = async () => {
    if (!editingId || !editingName.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateArticleUnit(editingId, editingName);
      setUnits((current) => sortUnits(current.map((unit) => unit.id === updated.id ? updated : unit)));
      setEditingId(null);
      setEditingName('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Einheit konnte nicht bearbeitet werden.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (unit: ArticleUnit) => {
    setSaving(true);
    setError(null);
    try {
      await deleteArticleUnit(unit.id);
      setUnits((current) => current.filter((entry) => entry.id !== unit.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Einheit konnte nicht gelöscht werden.');
    } finally {
      setSaving(false);
    }
  };

  const setArticleTypeField = (type: ArticleTypeSetting['type'], field: 'label' | 'prefix' | 'textColor' | 'nextNumber', value: string) => {
    setArticleTypes((current) => current.map((entry) => entry.type === type ? {
      ...entry,
      [field]: field === 'nextNumber' ? Math.max(1, Number(value) || 1) : value,
    } : entry));
  };

  const saveArticleType = async (setting: ArticleTypeSetting) => {
    if (!setting.label.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const updated = await updateArticleTypeSetting(setting.type, {
        label: setting.label,
        prefix: setting.prefix,
        textColor: setting.textColor,
        nextNumber: setting.nextNumber,
      });
      setArticleTypes((current) => current.map((entry) => entry.type === updated.type ? updated : entry));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Artikeltyp konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / EINSTELLUNGEN / ARTIKEL</Typography>
        <Typography variant="h1">Artikel</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Vorlagen und Auswahllisten für die Artikelverwaltung pflegen.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {!canManage && <Alert severity="warning">Änderungen sind nur für Administratoren möglich.</Alert>}

      <Box>
        <Typography variant="h2" sx={{ mb: 1 }}>Artikeleigenschaften und Nummernkreise</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Anzeigenamen und getrennte Nummernkreise der Artikeltypen verwalten. Die nächste Nummer wird bei jeder automatischen Artikelanlage erhöht.
        </Typography>
        <TableContainer sx={{ borderTop: 1, borderColor: 'divider' }}>
          <Table size="small" aria-label="Artikeltypen und Nummernkreise" sx={{ minWidth: 940 }}>
            <TableHead>
              <TableRow>
                <TableCell>ARTIKELTYP</TableCell>
                <TableCell>ANZEIGENAME</TableCell>
                <TableCell>PRÄFIX</TableCell>
                <TableCell>TEXTFARBE</TableCell>
                <TableCell>NÄCHSTE NUMMER</TableCell>
                <TableCell>VORSCHAU</TableCell>
                <TableCell align="right">AKTION</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {articleTypes.map((setting) => (
                <TableRow key={setting.type}>
                  <TableCell><Typography variant="caption" color="text.secondary">{setting.type}</Typography></TableCell>
                  <TableCell>
                    <TextField size="small" value={setting.label} disabled={!canManage || saving} onChange={(event) => setArticleTypeField(setting.type, 'label', event.target.value)} />
                  </TableCell>
                  <TableCell>
                    <TextField size="small" value={setting.prefix} disabled={!canManage || saving} onChange={(event) => setArticleTypeField(setting.type, 'prefix', event.target.value)} sx={{ width: 110 }} />
                  </TableCell>
                  <TableCell>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <TextField
                        size="small"
                        type="color"
                        aria-label={`Textfarbe für ${setting.label}`}
                        value={setting.textColor}
                        disabled={!canManage || saving}
                        onChange={(event) => setArticleTypeField(setting.type, 'textColor', event.target.value)}
                        sx={{ width: 64 }}
                      />
                      <Typography variant="caption" sx={{ color: setting.textColor }}>{setting.textColor.toUpperCase()}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>
                    <TextField size="small" type="number" value={setting.nextNumber} disabled={!canManage || saving} onChange={(event) => setArticleTypeField(setting.type, 'nextNumber', event.target.value)} slotProps={{ htmlInput: { min: 1, step: 1 } }} sx={{ width: 150 }} />
                  </TableCell>
                  <TableCell sx={{ color: 'primary.main', whiteSpace: 'nowrap' }}>
                    {setting.prefix}{String(setting.nextNumber).padStart(setting.padding, '0')}
                  </TableCell>
                  <TableCell align="right">
                    <Button disabled={!canManage || saving || !setting.label.trim()} onClick={() => void saveArticleType(setting)}>Speichern</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Box>
        <Typography variant="h2" sx={{ mb: 1 }}>Einheiten</Typography>
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Diese Einheiten stehen im Feld „Einheit“ eines Artikels zur Auswahl.
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ maxWidth: 680 }}>
          <TextField
            fullWidth
            label="Neue Einheit"
            placeholder="z. B. Kilogramm"
            value={name}
            disabled={!canManage || saving}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void add()}
          />
          <Button variant="contained" disabled={!canManage || saving || !name.trim()} onClick={() => void add()} sx={{ whiteSpace: 'nowrap' }}>
            Anlegen
          </Button>
        </Stack>
      </Box>

      <Box sx={{ maxWidth: 680, borderTop: 1, borderColor: 'divider' }}>
        {units.map((unit) => (
          <Stack key={unit.id} direction={{ xs: 'column', sm: 'row' }} alignItems={{ xs: 'stretch', sm: 'center' }} spacing={1} sx={{ minHeight: 52, py: 0.75, borderBottom: 1, borderColor: 'divider' }}>
            {editingId === unit.id ? (
              <TextField
                autoFocus
                fullWidth
                aria-label="Einheit bearbeiten"
                value={editingName}
                disabled={saving}
                onChange={(event) => setEditingName(event.target.value)}
                onKeyDown={(event) => event.key === 'Enter' && void saveEdit()}
                sx={{ flexGrow: 1 }}
              />
            ) : <Typography sx={{ flexGrow: 1 }}>{unit.name}</Typography>}

            {editingId === unit.id ? (
              <>
                <Button disabled={saving || !editingName.trim()} onClick={() => void saveEdit()}>Speichern</Button>
                <Button color="warning" disabled={saving} onClick={() => setEditingId(null)}>Abbrechen</Button>
              </>
            ) : (
              <>
                <Button disabled={!canManage || saving} onClick={() => startEdit(unit)}>Bearbeiten</Button>
                <Button color="error" disabled={!canManage || saving} onClick={() => void remove(unit)}>Löschen</Button>
              </>
            )}
          </Stack>
        ))}
        {units.length === 0 && <Typography color="text.secondary" sx={{ py: 2 }}>Keine Einheiten vorhanden.</Typography>}
      </Box>
    </Stack>
  );
}
