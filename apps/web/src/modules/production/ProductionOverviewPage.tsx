import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import {
  createProduction,
  listProductionInstructions,
  listProductions,
  type Production,
  type ProductionInstructionSummary,
} from '../../api/client';

const number = (value: number) => String(value).padStart(6, '0');

const statusLabel: Record<Production['status'], string> = {
  PLANNED: 'Geplant',
  IN_PROGRESS: 'In Produktion',
  PAUSED: 'Pausiert',
  COMPLETED: 'Abgeschlossen',
  PROBLEM: 'Problem',
};

const statusColor: Record<Production['status'], 'default' | 'info' | 'warning' | 'success' | 'error'> = {
  PLANNED: 'default',
  IN_PROGRESS: 'info',
  PAUSED: 'warning',
  COMPLETED: 'success',
  PROBLEM: 'error',
};

export function ProductionOverviewPage() {
  const [productions, setProductions] = useState<Production[]>([]);
  const [instructions, setInstructions] = useState<ProductionInstructionSummary[]>([]);
  const [productionInstructionId, setProductionInstructionId] = useState('');
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    Promise.all([listProductions(), listProductionInstructions()])
      .then(([loadedProductions, loadedInstructions]) => {
        setProductions(loadedProductions);
        setInstructions(loadedInstructions);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const selectedInstruction = instructions.find((instruction) => instruction.id === productionInstructionId);

  const filteredProductions = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase('de');
    if (!term) return productions;
    return productions.filter((production) => [
      number(production.productionNumber),
      number(production.instructionNumber),
      production.article.articleNumber,
      production.name,
      statusLabel[production.status],
    ].join(' ').toLocaleLowerCase('de').includes(term));
  }, [deferredSearch, productions]);

  const startCreate = () => {
    setProductionInstructionId('');
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    if (!productionInstructionId) {
      setError('Bitte eine Produktionsanweisung auswählen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createProduction(productionInstructionId);
      setProductions((current) => [created, ...current]);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Produktion konnte nicht angelegt werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'auto minmax(280px, 1fr) auto' }, gap: 1.5, alignItems: 'center' }}>
        <Box>
          <Typography variant="overline" color="primary.main">PRODUKTION</Typography>
          <Typography variant="h1" sx={{ whiteSpace: 'nowrap' }}>Produktionsübersicht</Typography>
        </Box>
        <TextField
          fullWidth
          size="small"
          label="Produktionen durchsuchen"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button variant="contained" onClick={startCreate} sx={{ whiteSpace: 'nowrap', px: 2.5 }}>
          Produktion anlegen
        </Button>
      </Box>

      <Typography color="text.secondary">
        Produktionen werden ausschließlich aus freigegebenen Produktionsanweisungen erzeugt. Artikel, Teile und Schritte werden aus der Vorlage übernommen.
      </Typography>
      {error && !open && <Alert severity="error">{error}</Alert>}

      <Box>
        <Typography variant="overline" color="text.secondary">
          {loading ? 'PRODUKTIONEN WERDEN GELADEN' : `${filteredProductions.length} VON ${productions.length} PRODUKTIONEN`}
        </Typography>
        <TableContainer sx={{ mt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Table size="small" aria-label="Produktionen" sx={{ minWidth: 920 }}>
            <TableHead>
              <TableRow>
                <TableCell>PRODUKTION</TableCell>
                <TableCell>ANWEISUNG</TableCell>
                <TableCell>ARTIKELNUMMER</TableCell>
                <TableCell>PRODUKTIONSNAME</TableCell>
                <TableCell>ZEITRAUM</TableCell>
                <TableCell align="right">TEILE / SCHRITTE</TableCell>
                <TableCell>STATUS</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProductions.map((production) => (
                <TableRow key={production.id} hover>
                  <TableCell sx={{ color: 'primary.main' }}>{number(production.productionNumber)}</TableCell>
                  <TableCell>{number(production.instructionNumber)}</TableCell>
                  <TableCell>{production.article.articleNumber}</TableCell>
                  <TableCell>{production.name}</TableCell>
                  <TableCell>{production.startDate.slice(0, 10)} – {production.completionDate.slice(0, 10)}</TableCell>
                  <TableCell align="right">
                    {production.elements.length} / {production.elements.reduce((sum, element) => sum + element.steps.length, 0)}
                  </TableCell>
                  <TableCell><Chip size="small" color={statusColor[production.status]} label={statusLabel[production.status]} /></TableCell>
                </TableRow>
              ))}
              {!loading && !filteredProductions.length && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 4, color: 'text.secondary' }}>
                    {search.trim() ? 'Keine passenden Produktionen gefunden.' : 'Noch keine Produktionen vorhanden.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="md">
        <DialogTitle>PRODUKTION AUS ANWEISUNG ANLEGEN</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ pt: 1 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {!instructions.length && (
              <Alert severity="warning">
                Es ist noch keine Produktionsanweisung vorhanden. Legen Sie zuerst unter „Produktionsanweisung“ eine Vorlage an.
              </Alert>
            )}
            <TextField
              select
              required
              fullWidth
              label="Produktionsanweisung"
              value={productionInstructionId}
              disabled={saving || !instructions.length}
              onChange={(event) => setProductionInstructionId(event.target.value)}
            >
              {instructions.map((instruction) => (
                <MenuItem key={instruction.id} value={instruction.id}>
                  {number(instruction.instructionNumber)} · {instruction.article.articleNumber} · {instruction.name}
                </MenuItem>
              ))}
            </TextField>

            {selectedInstruction && (
              <Box sx={{ border: 1, borderColor: 'divider', p: 2 }}>
                <Typography variant="overline" color="primary.main">VORLAGENINHALT</Typography>
                <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', gap: '8px 24px', m: 0, mt: 1 }}>
                  <Typography component="dt" color="text.secondary">Anweisung</Typography>
                  <Typography component="dd" sx={{ m: 0 }}>{number(selectedInstruction.instructionNumber)}</Typography>
                  <Typography component="dt" color="text.secondary">Produkt</Typography>
                  <Typography component="dd" sx={{ m: 0 }}>{selectedInstruction.article.articleNumber} · {selectedInstruction.name}</Typography>
                  <Typography component="dt" color="text.secondary">Zeitraum</Typography>
                  <Typography component="dd" sx={{ m: 0 }}>{selectedInstruction.startDate.slice(0, 10)} – {selectedInstruction.completionDate.slice(0, 10)}</Typography>
                  <Typography component="dt" color="text.secondary">Umfang</Typography>
                  <Typography component="dd" sx={{ m: 0 }}>
                    {selectedInstruction.elementCount} Teile · {selectedInstruction.stepCount} Schritte
                  </Typography>
                </Box>
              </Box>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ borderTop: 1, borderColor: 'divider', p: 2 }}>
          <Button color="warning" disabled={saving} onClick={() => setOpen(false)}>Abbrechen</Button>
          <Button variant="contained" disabled={saving || !productionInstructionId} onClick={() => void save()}>
            Produktion anlegen
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
