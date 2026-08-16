import { Fragment, useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
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
  Tooltip,
  Typography,
} from '@mui/material';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import PauseIcon from '@mui/icons-material/Pause';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  createProduction,
  listProductionInstructions,
  listProductions,
  type ProductionInstructionSummary,
  type ProductionSummary,
} from '../../api/client';

const number = (value: number) => String(value).padStart(6, '0');

const localDate = () => {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
};

const calendarDays = (startDate: string, completionDate: string) => {
  if (!startDate || !completionDate || completionDate < startDate) return 0;
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const completion = new Date(`${completionDate}T00:00:00.000Z`);
  return Math.floor((completion.getTime() - start.getTime()) / 86_400_000) + 1;
};

const currentProductionStep = (production: ProductionSummary) => {
  const steps = production.elements.flatMap((element) =>
    element.steps.map((step) => ({ element, step })),
  );
  return steps.find(({ step }) => ['IN_PROGRESS', 'PAUSED', 'PROBLEM'].includes(step.status))
    ?? steps.find(({ step }) => step.status === 'NOT_STARTED');
};

const currentStepLabel = (production: ProductionSummary) => {
  const current = currentProductionStep(production);
  const stepCount = production.elements.reduce((sum, element) => sum + element.steps.length, 0);
  if (!current) return stepCount ? 'Abgeschlossen' : 'Kein Arbeitsschritt';
  return `${current.element.name} · ${String(current.step.position).padStart(2, '0')} ${current.step.name}`;
};

type RecorderState = 'START' | 'PAUSE' | 'STOP' | 'RUNNING' | 'PROBLEM';

const recorderState = (production: ProductionSummary): RecorderState => {
  const stepStatus = currentProductionStep(production)?.step.status;
  if (stepStatus === 'PROBLEM' || production.status === 'PROBLEM') return 'PROBLEM';
  if (stepStatus === 'PAUSED' || production.status === 'PAUSED') return 'PAUSE';
  if (stepStatus === 'IN_PROGRESS' || production.status === 'IN_PROGRESS') return 'RUNNING';
  if (production.status === 'COMPLETED' || !currentProductionStep(production)) return 'STOP';
  return 'START';
};

const recorderItems = [
  { state: 'START', label: 'Start', Icon: PlayArrowIcon, color: 'primary.main' },
  { state: 'PAUSE', label: 'Pause', Icon: PauseIcon, color: 'warning.main' },
  { state: 'STOP', label: 'Stopp', Icon: StopIcon, color: 'text.secondary' },
  { state: 'RUNNING', label: 'Läuft', Icon: FiberManualRecordIcon, color: 'success.main' },
  { state: 'PROBLEM', label: 'Problem', Icon: WarningAmberIcon, color: 'error.main' },
] as const;

function RecorderIndicator({ production }: { production: ProductionSummary }) {
  const activeState = recorderState(production);
  const activeLabel = recorderItems.find((item) => item.state === activeState)?.label;

  return (
    <Box>
      <Stack direction="row" spacing={0.75} sx={{ mt: 1.25 }}>
        {recorderItems.map(({ state, label, Icon, color }) => {
          const active = state === activeState;
          return (
            <Tooltip key={state} title={label} arrow>
              <Box
                aria-label={`${label}${active ? ' – aktiv' : ''}`}
                sx={{
                  width: 34,
                  height: 34,
                  display: 'grid',
                  placeItems: 'center',
                  border: 1,
                  borderColor: active ? color : 'divider',
                  bgcolor: active ? 'action.selected' : 'transparent',
                  color: active ? color : 'text.disabled',
                }}
              >
                <Icon fontSize="small" />
              </Box>
            </Tooltip>
          );
        })}
      </Stack>
      <Typography variant="caption" sx={{ display: 'block', mt: 0.75, color: 'text.secondary' }}>
        STATUS: {activeLabel?.toLocaleUpperCase('de')}
      </Typography>
    </Box>
  );
}

export function ProductionOverviewPage() {
  const [productions, setProductions] = useState<ProductionSummary[]>([]);
  const [instructions, setInstructions] = useState<ProductionInstructionSummary[]>([]);
  const [productionInstructionId, setProductionInstructionId] = useState('');
  const [startDate, setStartDate] = useState(localDate);
  const [completionDate, setCompletionDate] = useState(localDate);
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
  const plannedDays = calendarDays(startDate, completionDate);

  const filteredProductions = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase('de');
    if (!term) return productions;
    return productions.filter((production) => [
      number(production.productionNumber),
      production.startDate.slice(0, 10),
      production.name,
      currentStepLabel(production),
    ].join(' ').toLocaleLowerCase('de').includes(term));
  }, [deferredSearch, productions]);

  const startCreate = () => {
    setProductionInstructionId('');
    setStartDate(localDate());
    setCompletionDate(localDate());
    setError(null);
    setOpen(true);
  };

  const save = async () => {
    if (!productionInstructionId) {
      setError('Bitte eine Produktionsanweisung auswählen.');
      return;
    }
    if (!startDate || !completionDate) {
      setError('Bitte Produktionsstart und Produktionsende vollständig angeben.');
      return;
    }
    if (!plannedDays) {
      setError('Das Produktionsende darf nicht vor dem Produktionsstart liegen.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const created = await createProduction({ productionInstructionId, startDate, completionDate });
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
          <Table size="small" aria-label="Produktionen" sx={{ minWidth: 780, tableLayout: 'fixed' }}>
            <TableHead>
              <TableRow>
                <TableCell>PRODUKTION</TableCell>
                <TableCell sx={{ width: { xs: 250, lg: 330 }, borderLeft: 1, borderColor: 'divider' }}>
                  AKTUELLER ARBEITSSCHRITT / AMPEL
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredProductions.map((production) => (
                <Fragment key={production.id}>
                  <TableRow>
                    <TableCell sx={{ pb: 0.75, borderBottom: 0 }}>
                      <Typography sx={{ color: 'primary.main', fontWeight: 600 }}>{production.name}</Typography>
                    </TableCell>
                    <TableCell
                      rowSpan={2}
                      sx={{ py: 1.5, verticalAlign: 'top', borderLeft: 1, borderColor: 'divider' }}
                    >
                      <Typography variant="overline" color="text.secondary">AKTUELLER SCHRITT</Typography>
                      <Typography sx={{ mt: 0.25, overflowWrap: 'anywhere' }}>{currentStepLabel(production)}</Typography>
                      <RecorderIndicator production={production} />
                    </TableCell>
                  </TableRow>
                  <TableRow sx={{ '& > td': { borderBottomWidth: 2 } }}>
                    <TableCell sx={{ pt: 0, pb: 1.75 }}>
                      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(100px, 1fr))', gap: 2 }}>
                        <Box>
                          <Typography variant="overline" color="text.secondary">PRODUKTION</Typography>
                          <Typography color="primary.main">{number(production.productionNumber)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="overline" color="text.secondary">STARTDATUM</Typography>
                          <Typography>{production.startDate.slice(0, 10)}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="overline" color="text.secondary">DAUER</Typography>
                          <Typography>{production.plannedDays} {production.plannedDays === 1 ? 'Tag' : 'Tage'}</Typography>
                        </Box>
                        <Box>
                          <Typography variant="overline" color="text.secondary">TEILE / SCHRITTE</Typography>
                          <Typography>
                            {production.elements.length} / {production.elements.reduce((sum, element) => sum + element.steps.length, 0)}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                  </TableRow>
                </Fragment>
              ))}
              {!loading && !filteredProductions.length && (
                <TableRow>
                  <TableCell colSpan={2} sx={{ py: 4, color: 'text.secondary' }}>
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
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(300px, 2fr) 1fr 1fr auto' }, gap: 2, alignItems: 'start' }}>
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
              <TextField
                required
                type="date"
                label="Produktionsstart"
                value={startDate}
                disabled={saving}
                onChange={(event) => setStartDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
              <TextField
                required
                type="date"
                label="Produktionsende"
                value={completionDate}
                disabled={saving}
                onChange={(event) => setCompletionDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: startDate } }}
              />
              <Box sx={{ minWidth: 112, minHeight: 56, px: 2, border: 1, borderColor: plannedDays ? 'primary.main' : 'error.main', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <Typography variant="overline" color="text.secondary">DAUER</Typography>
                <Typography color={plannedDays ? 'primary.main' : 'error.main'}>
                  {plannedDays || '–'} {plannedDays === 1 ? 'Tag' : 'Tage'}
                </Typography>
              </Box>
            </Box>

            {selectedInstruction && (
              <Box sx={{ border: 1, borderColor: 'divider', p: 2 }}>
                <Typography variant="overline" color="primary.main">VORLAGENINHALT</Typography>
                <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'max-content minmax(0, 1fr)', gap: '8px 24px', m: 0, mt: 1 }}>
                  <Typography component="dt" color="text.secondary">Anweisung</Typography>
                  <Typography component="dd" sx={{ m: 0 }}>{number(selectedInstruction.instructionNumber)}</Typography>
                  <Typography component="dt" color="text.secondary">Produkt</Typography>
                  <Typography component="dd" sx={{ m: 0 }}>{selectedInstruction.article.articleNumber} · {selectedInstruction.name}</Typography>
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
          <Button variant="contained" disabled={saving || !productionInstructionId || !plannedDays} onClick={() => void save()}>
            Produktion anlegen
          </Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
