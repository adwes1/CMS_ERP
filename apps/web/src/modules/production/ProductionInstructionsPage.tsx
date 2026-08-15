import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  IconButton,
  MenuItem,
  Stack,
  Switch,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AddOutlined,
  CloseOutlined,
  DeleteOutline,
  SaveOutlined,
} from '@mui/icons-material';
import {
  createProductionInstruction,
  deleteProductionInstruction,
  getProductionInstruction,
  listArticles,
  listProductionInstructions,
  updateProductionInstruction,
  type Article,
  type ProductionInstruction,
  type ProductionInstructionElementInput,
  type ProductionInstructionInput,
  type ProductionInstructionSummary,
  type ProductionInstructionStepInput,
} from '../../api/client';

const stepNames = ['Material bereitstellen', 'Montage', 'Bearbeitung', 'Qualitätsprüfung', 'Verpackung'];

const emptyStep = (): ProductionInstructionStepInput => ({
  name: '',
  workType: 'PHYSICAL_WORK',
  controlActive: true,
  employeeInstruction: '',
  employeeInstructionActive: false,
  confirmationRequired: false,
  plannedHours: 0,
  plannedMinutes: 0,
  timeEstimateActive: false,
  timerHours: 0,
  timerMinutes: 0,
  timerActive: false,
  serialNumberMode: 'NONE',
  serialNumberActive: false,
});

const emptyElement = (position: number): ProductionInstructionElementInput => ({
  name: `Produktelement ${position}`,
  steps: [emptyStep()],
});

const localDate = (date = new Date()) => {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
};

const emptyForm = (): ProductionInstructionInput => ({
  articleId: '',
  startDate: localDate(),
  completionDate: localDate(),
  partCount: 1,
  elements: [emptyElement(1)],
});

const instructionNumber = (value: number) => String(value).padStart(6, '0');

export function ProductionInstructionsPage() {
  const [instructions, setInstructions] = useState<ProductionInstructionSummary[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [form, setForm] = useState<ProductionInstructionInput>(emptyForm);
  const [editing, setEditing] = useState<ProductionInstruction | null>(null);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeElementIndex, setActiveElementIndex] = useState(0);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    Promise.all([listProductionInstructions(), listArticles()])
      .then(([loadedInstructions, loadedArticles]) => {
        setInstructions(loadedInstructions);
        setArticles(loadedArticles.filter((article) => ['PRODUKTIONSARTIKEL', 'STUECKLISTENARTIKEL'].includes(article.type)));
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const filteredInstructions = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase('de');
    if (!term) return instructions;
    return instructions.filter((entry) => [
      instructionNumber(entry.instructionNumber),
      entry.article.articleNumber,
      entry.name,
    ].join(' ').toLocaleLowerCase('de').includes(term));
  }, [deferredSearch, instructions]);

  const selectedArticle = articles.find((article) => article.id === form.articleId);

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setActiveElementIndex(0);
    setActiveStepIndex(0);
    setError(null);
    setOpen(true);
  };

  const startEdit = async (entry: ProductionInstructionSummary) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const detail = await getProductionInstruction(entry.id);
      setEditing(detail);
      setForm({
        articleId: detail.articleId,
        startDate: detail.startDate.slice(0, 10),
        completionDate: detail.completionDate.slice(0, 10),
        partCount: detail.partCount,
        elements: detail.elements.map((element) => ({
          name: element.name,
          steps: element.steps.map((step) => ({
            name: step.name,
            workType: step.workType,
            controlActive: step.controlActive,
            employeeInstruction: step.employeeInstruction ?? '',
            employeeInstructionActive: step.employeeInstructionActive,
            confirmationRequired: step.confirmationRequired,
            plannedHours: step.plannedHours,
            plannedMinutes: step.plannedMinutes,
            timeEstimateActive: step.timeEstimateActive,
            timerHours: step.timerHours,
            timerMinutes: step.timerMinutes,
            timerActive: step.timerActive,
            serialNumberMode: step.serialNumberMode,
            serialNumberActive: step.serialNumberActive,
          })),
        })),
      });
      setActiveElementIndex(0);
      setActiveStepIndex(0);
      setOpen(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Produktionsanweisung konnte nicht geladen werden.');
    } finally {
      setLoadingDetail(false);
    }
  };

  const setPartCount = (value: number) => {
    const partCount = Math.max(1, Math.min(100, Number.isFinite(value) ? value : 1));
    setForm((current) => ({
      ...current,
      partCount,
      elements: Array.from({ length: partCount }, (_, index) => current.elements[index] ?? emptyElement(index + 1)),
    }));
    setActiveElementIndex((current) => Math.min(current, partCount - 1));
    setActiveStepIndex(0);
  };

  const updateElement = (elementIndex: number, update: Partial<ProductionInstructionElementInput>) => {
    setForm((current) => ({
      ...current,
      elements: current.elements.map((element, index) => index === elementIndex ? { ...element, ...update } : element),
    }));
  };

  const updateStep = (elementIndex: number, stepIndex: number, update: Partial<ProductionInstructionStepInput>) => {
    setForm((current) => ({
      ...current,
      elements: current.elements.map((element, index) => index === elementIndex
        ? { ...element, steps: element.steps.map((step, indexOfStep) => indexOfStep === stepIndex ? { ...step, ...update } : step) }
        : element),
    }));
  };

  const addStep = (elementIndex: number) => {
    const newStepIndex = form.elements[elementIndex]?.steps.length ?? 0;
    setForm((current) => ({
      ...current,
      elements: current.elements.map((element, index) => index === elementIndex
        ? { ...element, steps: [...element.steps, emptyStep()] }
        : element),
    }));
    setActiveStepIndex(newStepIndex);
  };

  const removeStep = (elementIndex: number, stepIndex: number) => {
    const remainingStepCount = Math.max(1, (form.elements[elementIndex]?.steps.length ?? 1) - 1);
    setForm((current) => ({
      ...current,
      elements: current.elements.map((element, index) => index === elementIndex
        ? { ...element, steps: element.steps.filter((_step, indexOfStep) => indexOfStep !== stepIndex) }
        : element),
    }));
    setActiveStepIndex((current) => Math.min(current === stepIndex ? Math.max(0, stepIndex - 1) : current, remainingStepCount - 1));
  };

  const save = async () => {
    if (!form.articleId || !form.startDate || !form.completionDate) {
      setError('Bitte Artikel, Startdatum und Abschlussdatum vollständig angeben.');
      return;
    }
    if (form.completionDate < form.startDate) {
      setError('Das Abschlussdatum darf nicht vor dem Startdatum liegen.');
      return;
    }
    if (form.elements.some((element) => !element.name.trim() || !element.steps.length || element.steps.some((step) => !step.name.trim()))) {
      setError('Jedes Produktelement benötigt einen Namen und mindestens einen vollständig bezeichneten Schritt.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const saved = editing
        ? await updateProductionInstruction(editing.id, form)
        : await createProductionInstruction(form);
      const { elements, ...savedWithoutElements } = saved;
      const summary: ProductionInstructionSummary = {
        ...savedWithoutElements,
        elementCount: elements.length,
        stepCount: elements.reduce((sum, element) => sum + element.steps.length, 0),
      };
      setInstructions((current) => editing
        ? current.map((entry) => entry.id === saved.id ? summary : entry)
        : [summary, ...current]);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Produktionsanweisung konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (entry: ProductionInstructionSummary) => {
    if (!window.confirm(`Produktionsanweisung ${instructionNumber(entry.instructionNumber)} wirklich löschen?`)) return;
    setSaving(true);
    setError(null);
    try {
      await deleteProductionInstruction(entry.id);
      setInstructions((current) => current.filter((item) => item.id !== entry.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Produktionsanweisung konnte nicht gelöscht werden.');
    } finally {
      setSaving(false);
    }
  };

  const mainNumber = editing ? instructionNumber(editing.instructionNumber) : 'NEU';
  const activeElement = form.elements[activeElementIndex] ?? form.elements[0];
  const activeStep = activeElement?.steps[activeStepIndex] ?? activeElement?.steps[0];
  const activeElementNumber = form.partCount > 1
    ? `${mainNumber}.${String(activeElementIndex + 1).padStart(3, '0')}`
    : mainNumber;

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'auto minmax(280px, 1fr) auto' }, gap: 1.5, alignItems: 'center' }}>
        <Box>
          <Typography variant="overline" color="primary.main">PRODUKTION / VORLAGEN</Typography>
          <Typography variant="h1" sx={{ whiteSpace: 'nowrap' }}>Produktionsanweisungen</Typography>
        </Box>
        <TextField
          fullWidth
          size="small"
          label="Vorlagen durchsuchen"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button variant="contained" onClick={startCreate} sx={{ whiteSpace: 'nowrap', px: 2.5 }}>
          Anweisung anlegen
        </Button>
      </Box>

      <Typography color="text.secondary">
        Vorlagen definieren Produktelemente und deren Arbeitsschritte. Ampelstatus werden in einer späteren Ausbaustufe ergänzt.
      </Typography>
      {error && !open && <Alert severity="error">{error}</Alert>}

      <Box>
        <Typography variant="overline" color="text.secondary">
          {loading ? 'PRODUKTIONSANWEISUNGEN WERDEN GELADEN' : `${filteredInstructions.length} VON ${instructions.length} VORLAGEN`}
        </Typography>
        <TableContainer sx={{ mt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Table size="small" aria-label="Produktionsanweisungen" sx={{ minWidth: 820 }}>
            <TableHead>
              <TableRow>
                <TableCell>NUMMER</TableCell>
                <TableCell>ARTIKELNUMMER</TableCell>
                <TableCell>PRODUKTIONSNAME</TableCell>
                <TableCell>ZEITRAUM</TableCell>
                <TableCell align="right">TEILE / SCHRITTE</TableCell>
                <TableCell align="right">AKTIONEN</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredInstructions.map((entry) => (
                <TableRow key={entry.id} hover role="button" tabIndex={0} onClick={() => void startEdit(entry)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ color: 'primary.main' }}>{instructionNumber(entry.instructionNumber)}</TableCell>
                  <TableCell>{entry.article.articleNumber}</TableCell>
                  <TableCell>{entry.name}</TableCell>
                  <TableCell>{entry.startDate.slice(0, 10)} – {entry.completionDate.slice(0, 10)}</TableCell>
                  <TableCell align="right">{entry.elementCount} / {entry.stepCount}</TableCell>
                  <TableCell align="right">
                    <Tooltip title="Löschen">
                      <IconButton size="small" color="error" disabled={saving || loadingDetail} onClick={(event) => { event.stopPropagation(); void remove(entry); }}>
                        <DeleteOutline fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!loading && !filteredInstructions.length && (
                <TableRow>
                  <TableCell colSpan={6} sx={{ py: 4, color: 'text.secondary' }}>
                    {search.trim() ? 'Keine passenden Vorlagen gefunden.' : 'Noch keine Produktionsanweisungen vorhanden.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="xl">
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="overline" color="primary.main">PRODUKTIONSANWEISUNG {mainNumber}</Typography>
            <Typography variant="h5">{editing ? editing.name : 'Neue Vorlage'}</Typography>
          </Box>
          <Tooltip title="Speichern"><span><IconButton color="primary" onClick={() => void save()} disabled={saving}><SaveOutlined /></IconButton></span></Tooltip>
          <Tooltip title="Abbrechen"><span><IconButton color="warning" onClick={() => setOpen(false)} disabled={saving}><CloseOutlined /></IconButton></span></Tooltip>
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ pt: 2 }}>
            {error && <Alert severity="error">{error}</Alert>}
            {!articles.length && <Alert severity="warning">Es sind noch keine Produktions- oder Stücklistenartikel vorhanden.</Alert>}

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 2fr 1fr 1fr 1fr' }, gap: 2 }}>
              <TextField select required label="Artikelnummer" value={form.articleId} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, articleId: event.target.value }))}>
                {articles.map((article) => <MenuItem key={article.id} value={article.id}>{article.articleNumber}</MenuItem>)}
              </TextField>
              <TextField label="Produktionsname" value={selectedArticle?.name ?? editing?.name ?? ''} slotProps={{ input: { readOnly: true } }} helperText="Wird aus dem Artikel übernommen" />
              <TextField required type="date" label="Produktionsstart" value={form.startDate} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, startDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField required type="date" label="Abschluss bis" value={form.completionDate} disabled={saving} onChange={(event) => setForm((current) => ({ ...current, completionDate: event.target.value }))} slotProps={{ inputLabel: { shrink: true } }} />
              <TextField required type="number" label="Anzahl Teile" value={form.partCount} disabled={saving} onChange={(event) => setPartCount(Number(event.target.value))} slotProps={{ htmlInput: { min: 1, max: 100 } }} />
            </Box>

            <Divider />
            <Box>
              <Typography variant="h6">Teile und Schritte</Typography>
              <Typography color="text.secondary" variant="body2">
                Bei mehreren Teilen werden Teilanweisungen mit der Hauptnummer und dem Zusatz .001, .002 usw. gebildet.
              </Typography>
            </Box>

            <Box sx={{ border: 1, borderColor: 'divider' }}>
              <Tabs
                value={activeElementIndex}
                onChange={(_event, value: number) => { setActiveElementIndex(value); setActiveStepIndex(0); }}
                variant="scrollable"
                scrollButtons="auto"
                aria-label="Produktionsteile"
                sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'action.hover' }}
              >
                {form.elements.map((element, elementIndex) => {
                  const elementNumber = form.partCount > 1
                    ? `${mainNumber}.${String(elementIndex + 1).padStart(3, '0')}`
                    : mainNumber;
                  return <Tab key={elementIndex} label={`${elementNumber} · ${element.name || `Teil ${elementIndex + 1}`}`} />;
                })}
              </Tabs>

              {activeElement && activeStep && (
                <Stack spacing={2.5} sx={{ p: 2 }}>
                  <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ md: 'center' }}>
                    <Typography variant="overline" color="primary.main" sx={{ minWidth: 120 }}>{activeElementNumber}</Typography>
                    <TextField
                      fullWidth
                      required
                      size="small"
                      label={`Name von Teil ${activeElementIndex + 1}`}
                      value={activeElement.name}
                      disabled={saving}
                      onChange={(event) => updateElement(activeElementIndex, { name: event.target.value })}
                    />
                  </Stack>

                  <Box sx={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) auto', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                      value={activeStepIndex}
                      onChange={(_event, value: number) => setActiveStepIndex(value)}
                      variant="scrollable"
                      scrollButtons="auto"
                      aria-label={`Schritte von ${activeElement.name}`}
                    >
                      {activeElement.steps.map((step, stepIndex) => (
                        <Tab key={stepIndex} label={`${String(stepIndex + 1).padStart(2, '0')} · ${step.name || 'Neuer Schritt'}`} />
                      ))}
                    </Tabs>
                    <Button
                      startIcon={<AddOutlined />}
                      onClick={() => addStep(activeElementIndex)}
                      disabled={saving}
                      sx={{ whiteSpace: 'nowrap', mx: 1 }}
                    >
                      Schritt hinzufügen
                    </Button>
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr auto' }, gap: 2, alignItems: 'center' }}>
                    <Autocomplete
                      freeSolo
                      options={stepNames}
                      value={activeStep.name}
                      inputValue={activeStep.name}
                      onInputChange={(_event, value) => updateStep(activeElementIndex, activeStepIndex, { name: value })}
                      renderInput={(params) => <TextField {...params} required size="small" label="Schrittbezeichnung / Anweisungsname" />}
                    />
                    <TextField select size="small" label="Arbeit oder Prozess" value={activeStep.workType} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { workType: event.target.value as ProductionInstructionStepInput['workType'] })}>
                      <MenuItem value="PHYSICAL_WORK">Physische Arbeit</MenuItem>
                      <MenuItem value="PROCESS">Prozess</MenuItem>
                    </TextField>
                    <FormControlLabel control={<Switch checked={activeStep.controlActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { controlActive: event.target.checked })} />} label="Start / Pause / Stopp aktiv" />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(260px, 2fr) auto auto' }, gap: 2, alignItems: 'center' }}>
                    <TextField multiline minRows={2} size="small" label="Anweisung an den Mitarbeiter" value={activeStep.employeeInstruction ?? ''} disabled={!activeStep.employeeInstructionActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { employeeInstruction: event.target.value })} />
                    <FormControlLabel control={<Switch checked={activeStep.employeeInstructionActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { employeeInstructionActive: event.target.checked })} />} label="Anweisung aktiv" />
                    <FormControlLabel control={<Switch checked={activeStep.confirmationRequired} disabled={!activeStep.employeeInstructionActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { confirmationRequired: event.target.checked })} />} label="Bestätigung erforderlich" />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: '120px 120px auto 120px 120px auto' }, gap: 2, alignItems: 'center' }}>
                    <TextField type="number" size="small" label="Vorgabe Std." value={activeStep.plannedHours} disabled={!activeStep.timeEstimateActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { plannedHours: Math.max(0, Number(event.target.value)) })} slotProps={{ htmlInput: { min: 0, max: 999 } }} />
                    <TextField type="number" size="small" label="Vorgabe Min." value={activeStep.plannedMinutes} disabled={!activeStep.timeEstimateActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { plannedMinutes: Math.max(0, Math.min(59, Number(event.target.value))) })} slotProps={{ htmlInput: { min: 0, max: 59 } }} />
                    <FormControlLabel control={<Switch checked={activeStep.timeEstimateActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { timeEstimateActive: event.target.checked })} />} label="Zeitvorgabe aktiv" />
                    <TextField type="number" size="small" label="Timer Std." value={activeStep.timerHours} disabled={!activeStep.timerActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { timerHours: Math.max(0, Number(event.target.value)) })} slotProps={{ htmlInput: { min: 0, max: 999 } }} />
                    <TextField type="number" size="small" label="Timer Min." value={activeStep.timerMinutes} disabled={!activeStep.timerActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { timerMinutes: Math.max(0, Math.min(59, Number(event.target.value))) })} slotProps={{ htmlInput: { min: 0, max: 59 } }} />
                    <FormControlLabel control={<Switch checked={activeStep.timerActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { timerActive: event.target.checked })} />} label="Timer aktiv" />
                  </Box>

                  <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px auto 1fr auto' }, gap: 2, alignItems: 'center' }}>
                    <TextField select size="small" label="Seriennummernvergabe" value={activeStep.serialNumberMode} disabled={!activeStep.serialNumberActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { serialNumberMode: event.target.value as ProductionInstructionStepInput['serialNumberMode'] })}>
                      <MenuItem value="NONE">Keine</MenuItem>
                      <MenuItem value="GENERATOR">Generator</MenuItem>
                      <MenuItem value="INPUT">Manuelle Eingabe</MenuItem>
                    </TextField>
                    <FormControlLabel control={<Switch checked={activeStep.serialNumberActive} onChange={(event) => updateStep(activeElementIndex, activeStepIndex, { serialNumberActive: event.target.checked, serialNumberMode: event.target.checked && activeStep.serialNumberMode === 'NONE' ? 'GENERATOR' : activeStep.serialNumberMode })} />} label="Seriennummer aktiv" />
                    <Box />
                    <Tooltip title="Schritt löschen">
                      <span>
                        <IconButton color="error" disabled={saving || activeElement.steps.length === 1} onClick={() => removeStep(activeElementIndex, activeStepIndex)}>
                          <DeleteOutline />
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Stack>
              )}
            </Box>
          </Stack>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
