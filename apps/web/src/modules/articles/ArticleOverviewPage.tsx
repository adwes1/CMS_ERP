import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
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
import { CloseOutlined, DeleteOutline, SaveOutlined } from '@mui/icons-material';
import {
  createArticle,
  getArticle,
  listAddresses,
  listArticleTypeSettings,
  listArticleUnits,
  listArticles,
  listProductionInstructions,
  listWarehouseLocations,
  uploadArticleImage,
  updateArticle,
  type Address,
  type Article,
  type ArticleType,
  type ArticleTypeSetting,
  type ArticleUnit,
  type CreateArticleInput,
  type ProductionInstructionSummary,
  type WarehouseLocation,
} from '../../api/client';

type Section = 'master' | 'stockEntries' | 'purchasePrices' | 'salePrices' | 'positions' | 'production' | 'variants' | 'externalNumbers' | 'files' | 'purchasing';
type Collection = 'stockEntries' | 'purchasePrices' | 'salePrices' | 'positions' | 'externalNumbers' | 'files';

const sections: { id: Section; label: string }[] = [
  { id: 'master', label: 'Stammdaten' },
  { id: 'stockEntries', label: 'Lagerbestand' },
  { id: 'purchasePrices', label: 'EK-Preisentwicklung' },
  { id: 'salePrices', label: 'VK-Preisentwicklung' },
  { id: 'positions', label: 'Positionen' },
  { id: 'production', label: 'Produktion' },
  { id: 'variants', label: 'Varianten' },
  { id: 'externalNumbers', label: 'Fremdnummern' },
  { id: 'files', label: 'Dateien' },
  { id: 'purchasing', label: 'Einkauf' },
];

const defaultTypeLabels: Record<Article['type'], string> = {
  VERKAUFSARTIKEL: 'Einkaufsartikel',
  PRODUKTIONSARTIKEL: 'Produktionsartikel',
  PRODUKTIONSMATERIAL: 'Produktionsmaterial',
  STUECKLISTENARTIKEL: 'Stücklistenartikel',
  DIGITAL_DOWNLOAD: 'Digital-Download',
  RABATT_GUTSCHEIN: 'Rabatt-Gutschein',
  VERSANDGEBUEHREN: 'Versandgebühren',
};

const emptyForm = (unitId = ''): CreateArticleInput => ({
  articleNumber: '',
  name: '',
  type: 'VERKAUFSARTIKEL',
  stock: '0',
  stockEntries: [{ warehouseLocationId: '', warehouseLocation: '', stock: '0', minimumStock: '0' }],
  unitId,
  vatRate: '19',
  netWeightKg: '',
  grossWeightKg: '',
  lengthCm: '',
  widthCm: '',
  heightCm: '',
  notes: '',
  purchasePrices: [{ supplierAddressId: '', supplierName: '', supplierAddressNumber: '', netPrice: '', validFrom: new Date().toISOString().slice(0, 10), note: '' }],
  salePrices: [{ netPrice: '', validFrom: new Date().toISOString().slice(0, 10), note: '' }],
  positions: [],
  externalNumbers: [],
  files: [],
  variantIds: [],
  useAutomaticArticleNumber: true,
  purchasing: {
    supplier: '', supplierArticleNumber: '', purchaseUnit: 'Stk.', minimumOrderQuantity: '',
    packagingUnit: '', deliveryTimeDays: '', orderNote: '',
  },
});

const fieldGrid = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
  columnGap: 1.5,
  rowGap: 1.25,
};

const isPopulated = (row: Record<string, string>) => Object.values(row).some((value) => value.trim());
const warehouseLocationLabel = (entry: WarehouseLocation) => `${entry.location} / ${entry.shelf} / ${entry.position}`;
const PRODUCT_IMAGE_CATEGORY = 'Produktabbildung';
const productionInstructionNumber = (value: number) => String(value).padStart(6, '0');
const addressNumber = (value: number) => `ADR-${String(value).padStart(6, '0')}`;
const addressName = (address: Address) => address.company || [address.firstName, address.lastName].filter(Boolean).join(' ') || addressNumber(address.addressNumber);
const supplierLabel = (address: Address) => [addressName(address), addressNumber(address.addressNumber), address.city].filter(Boolean).join(' · ');

export function ArticleOverviewPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [units, setUnits] = useState<ArticleUnit[]>([]);
  const [warehouseLocations, setWarehouseLocations] = useState<WarehouseLocation[]>([]);
  const [productionInstructions, setProductionInstructions] = useState<ProductionInstructionSummary[]>([]);
  const [suppliers, setSuppliers] = useState<Address[]>([]);
  const [articleTypeSettings, setArticleTypeSettings] = useState<ArticleTypeSetting[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Article | null>(null);
  const [section, setSection] = useState<Section>('master');
  const [form, setForm] = useState<CreateArticleInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    Promise.all([listArticles(), listArticleUnits(), listWarehouseLocations(), listProductionInstructions(), listAddresses({ page: 1, pageSize: 1000 }), listArticleTypeSettings()])
      .then(([articleResult, unitResult, warehouseLocationResult, productionInstructionResult, addressResult, articleTypeSettingResult]) => {
        setArticles(articleResult);
        setUnits(unitResult);
        setWarehouseLocations(warehouseLocationResult);
        setProductionInstructions(productionInstructionResult);
        setSuppliers(addressResult.items.filter((address) => address.type === 'LIEFERANT' || address.type === 'BEIDES'));
        setArticleTypeSettings(articleTypeSettingResult);
      })
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const typeLabels = useMemo(() => articleTypeSettings.reduce<Record<ArticleType, string>>(
    (labels, setting) => ({ ...labels, [setting.type]: setting.label }),
    { ...defaultTypeLabels },
  ), [articleTypeSettings]);
  const typeTextColors = useMemo(() => articleTypeSettings.reduce<Partial<Record<ArticleType, string>>>(
    (colors, setting) => ({ ...colors, [setting.type]: setting.textColor }),
    {},
  ), [articleTypeSettings]);

  const filteredArticles = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase('de');
    if (!term) return articles;
    return articles.filter((article) => [
      article.articleNumber, article.name, typeLabels[article.type], article.stock, article.unit.name,
      ...(article.externalNumbers ?? []).flatMap((row) => Object.values(row)),
    ].join(' ').toLocaleLowerCase('de').includes(term));
  }, [articles, deferredSearch, typeLabels]);

  const setField = (field: keyof CreateArticleInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setArticleType = (type: ArticleType) => {
    const setting = articleTypeSettings.find((entry) => entry.type === type);
    setForm((current) => ({
      ...current,
      type,
      articleNumber: !editing && current.useAutomaticArticleNumber ? (setting?.nextArticleNumber ?? '') : current.articleNumber,
    }));
  };

  const setPurchasingField = (field: string, value: string) => {
    setForm((current) => ({ ...current, purchasing: { ...(current.purchasing ?? {}), [field]: value } }));
  };

  const setCollectionField = (collection: Collection, index: number, field: string, value: string) => {
    setForm((current) => ({
      ...current,
      [collection]: (current[collection] ?? []).map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
    }));
  };

  const setPositionArticle = (index: number, article: Article | null) => {
    setForm((current) => ({
      ...current,
      positions: (current.positions ?? []).map((row, rowIndex) => rowIndex === index ? {
        ...row,
        articleNumber: article?.articleNumber ?? '',
        description: article?.name ?? '',
        unit: article?.unit.name ?? '',
      } : row),
    }));
  };

  const setPositionSearch = (index: number, field: 'articleNumber' | 'description', value: string) => {
    setForm((current) => ({
      ...current,
      positions: (current.positions ?? []).map((row, rowIndex) => rowIndex === index ? {
        ...row,
        articleNumber: field === 'articleNumber' ? value : '',
        description: field === 'description' ? value : '',
        unit: '',
      } : row),
    }));
  };

  const setPurchasePriceSupplier = (index: number, supplier: Address | null) => {
    setForm((current) => ({
      ...current,
      purchasePrices: (current.purchasePrices ?? []).map((row, rowIndex) => rowIndex === index ? {
        ...row,
        supplierAddressId: supplier?.id ?? '',
        supplierName: supplier ? addressName(supplier) : '',
        supplierAddressNumber: supplier ? addressNumber(supplier.addressNumber) : '',
      } : row),
    }));
  };

  const addCollectionRow = (collection: Collection, row: Record<string, string>) => {
    setForm((current) => ({ ...current, [collection]: [...(current[collection] ?? []), row] }));
  };

  const removeCollectionRow = (collection: Collection, index: number) => {
    setForm((current) => ({ ...current, [collection]: (current[collection] ?? []).filter((_row, rowIndex) => rowIndex !== index) }));
  };

  const productImage = (form.files ?? []).find((file) => file.category === PRODUCT_IMAGE_CATEGORY);

  const setProductImage = (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Bitte eine gültige Bilddatei auswählen.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Das Produktbild darf maximal 2 MB groß sein.');
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => setError('Das Produktbild konnte nicht gelesen werden.');
    reader.onload = async () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      if (!dataUrl) return;
      setSaving(true);
      setError(null);
      try {
        const uploaded = await uploadArticleImage(file.name, dataUrl);
        setForm((current) => ({
          ...current,
          files: [
            ...(current.files ?? []).filter((entry) => entry.category !== PRODUCT_IMAGE_CATEGORY),
            {
              name: file.name,
              category: PRODUCT_IMAGE_CATEGORY,
              reference: uploaded.reference,
              version: '1',
              date: new Date().toISOString().slice(0, 10),
              description: 'Produktbild',
              mimeType: uploaded.mimeType,
            },
          ],
        }));
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Das Produktbild konnte nicht hochgeladen werden.');
      } finally {
        setSaving(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeProductImage = () => {
    setForm((current) => ({
      ...current,
      files: (current.files ?? []).filter((entry) => entry.category !== PRODUCT_IMAGE_CATEGORY),
    }));
  };

  const startCreate = () => {
    setEditing(null);
    const values = emptyForm(units.find((unit) => unit.name === 'Stück')?.id ?? units[0]?.id ?? '');
    values.articleNumber = articleTypeSettings.find((setting) => setting.type === values.type)?.nextArticleNumber ?? '';
    setForm(values);
    setSection('master');
    setError(null);
    setOpen(true);
  };

  const openArticle = (article: Article) => {
    const { id: _id, unit: _unit, variantLinks, createdAt: _createdAt, updatedAt: _updatedAt, ...values } = article;
    setEditing(article);
    setForm({
      ...emptyForm(),
      ...values,
      purchasePrices: values.purchasePrices ?? [],
      salePrices: values.salePrices ?? [],
      stockEntries: values.stockEntries?.length ? values.stockEntries.map((row) => {
        const matches = warehouseLocations.filter((entry) =>
          entry.id === row.warehouseLocationId
          || warehouseLocationLabel(entry) === row.warehouseLocation
          || entry.location === row.warehouseLocation,
        );
        const match = matches.length === 1 ? matches[0] : undefined;
        return match
          ? { ...row, warehouseLocationId: match.id, warehouseLocation: warehouseLocationLabel(match) }
          : row;
      }) : emptyForm().stockEntries,
      positions: values.positions ?? [],
      externalNumbers: values.externalNumbers ?? [],
      files: values.files ?? [],
      variantIds: (variantLinks ?? []).map((link) => link.variantArticleId),
      purchasing: values.purchasing ?? emptyForm().purchasing,
      useAutomaticArticleNumber: false,
    });
    setSection('master');
    setError(null);
    setOpen(true);
  };

  const startEdit = async (article: Article) => {
    setError(null);
    try {
      openArticle(await getArticle(article.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Artikel konnte nicht geladen werden.');
    }
  };

  const save = async () => {
    if (!form.articleNumber.trim() || !form.name.trim() || !form.type) {
      setSection('master');
      setError('Bitte Artikelnummer, Bezeichnung und Artikeltyp angeben.');
      return;
    }
    const cleanPositions = (form.positions ?? []).filter(isPopulated);
    const netWeight = form.netWeightKg === '' || form.netWeightKg == null ? null : Number(form.netWeightKg);
    const grossWeight = form.grossWeightKg === '' || form.grossWeightKg == null ? null : Number(form.grossWeightKg);
    if ((netWeight !== null && netWeight < 0) || (grossWeight !== null && grossWeight < 0)
      || (netWeight !== null && grossWeight !== null && grossWeight < netWeight)) {
      setSection('master');
      setError('Gewichte müssen gültig sein; das Bruttogewicht darf nicht kleiner als das Nettogewicht sein.');
      return;
    }
    const validStockEntries = (form.stockEntries ?? []).filter((row) =>
      row.warehouseLocationId && warehouseLocations.some((entry) => entry.id === row.warehouseLocationId)
      && row.stock !== '' && row.minimumStock !== '',
    );
    const validPurchasePrices = (form.purchasePrices ?? []).filter((row) => row.netPrice?.trim() && row.validFrom?.trim());
    const validSalePrices = (form.salePrices ?? []).filter((row) => row.netPrice?.trim() && row.validFrom?.trim());

    setSaving(true);
    setError(null);
    try {
      const input: CreateArticleInput = {
        ...form,
        netWeightKg: form.netWeightKg?.trim() || undefined,
        grossWeightKg: form.grossWeightKg?.trim() || undefined,
        lengthCm: form.lengthCm?.trim() || undefined,
        widthCm: form.widthCm?.trim() || undefined,
        heightCm: form.heightCm?.trim() || undefined,
        stock: validStockEntries.reduce((total, row) => total + Number(row.stock || 0), 0).toString(),
        stockEntries: validStockEntries,
        purchasePrices: validPurchasePrices,
        salePrices: validSalePrices,
        positions: cleanPositions,
        externalNumbers: (form.externalNumbers ?? []).filter(isPopulated),
        files: (form.files ?? []).filter(isPopulated),
      };
      const saved = editing ? await updateArticle(editing.id, input) : await createArticle(input);
      setArticles((current) => (editing
        ? current.map((article) => article.id === saved.id ? saved : article)
        : [...current, saved]
      ).sort((a, b) => a.articleNumber.localeCompare(b.articleNumber, 'de')));
      if (!editing && form.useAutomaticArticleNumber) {
        void listArticleTypeSettings().then(setArticleTypeSettings).catch(() => undefined);
      }
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Artikel konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const renderCollection = (
    collection: Collection,
    fields: { key: string; label: string; type?: string; placeholder?: string }[],
    emptyRow: Record<string, string>,
    addLabel: string,
  ) => (
    <Stack spacing={2}>
      {(form[collection] ?? []).map((row, index) => (
        <Box key={index} sx={{ ...fieldGrid, pb: 1.5, borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
          {fields.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              type={field.type}
              placeholder={field.placeholder}
              value={row[field.key] ?? ''}
              onChange={(event) => setCollectionField(collection, index, field.key, event.target.value)}
              slotProps={field.type === 'number' ? { htmlInput: { step: '0.001', min: 0 } } : undefined}
            />
          ))}
          <Tooltip title="Zeile entfernen">
            <IconButton
              aria-label="Zeile entfernen"
              color="error"
              size="small"
              onClick={() => removeCollectionRow(collection, index)}
              sx={{ position: 'absolute', right: -8, top: -14 }}
            >
              <DeleteOutline fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      ))}
      <Button variant="outlined" onClick={() => addCollectionRow(collection, emptyRow)} sx={{ alignSelf: 'flex-start' }}>
        + {addLabel}
      </Button>
    </Stack>
  );

  const renderSection = () => {
    if (section === 'stockEntries') {
      const totalStock = (form.stockEntries ?? []).reduce((total, row) => total + Number(row.stock || 0), 0);
      return (
        <Stack spacing={2}>
          <Alert severity="info">
            Gesamtbestand: {Number.isFinite(totalStock) ? totalStock.toLocaleString('de-DE', { maximumFractionDigits: 3 }) : '—'} {units.find((unit) => unit.id === form.unitId)?.name ?? ''}
          </Alert>
          <Typography color="text.secondary">
            Der Mindestbestand dient später als Grundlage für automatische Bestellvorschläge.
          </Typography>
          {(form.stockEntries ?? []).map((row, index) => {
            const selectedLocation = warehouseLocations.find((entry) => entry.id === row.warehouseLocationId) ?? null;
            return (
              <Box key={index} sx={{ ...fieldGrid, pb: 1.5, borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
                <Autocomplete
                  options={warehouseLocations}
                  value={selectedLocation}
                  inputValue={selectedLocation ? warehouseLocationLabel(selectedLocation) : (row.warehouseLocation ?? '')}
                  getOptionLabel={warehouseLocationLabel}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  noOptionsText="Keine passenden Lagerplätze"
                  onInputChange={(_event, value, reason) => {
                    if (reason === 'input') {
                      setCollectionField('stockEntries', index, 'warehouseLocationId', '');
                      setCollectionField('stockEntries', index, 'warehouseLocation', value);
                    }
                  }}
                  onChange={(_event, value) => {
                    setCollectionField('stockEntries', index, 'warehouseLocationId', value?.id ?? '');
                    setCollectionField('stockEntries', index, 'warehouseLocation', value ? warehouseLocationLabel(value) : '');
                  }}
                  renderInput={(params) => <TextField {...params} required label="Lagerplatz suchen" placeholder="Ort, Regal oder Platz eingeben" />}
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
                <TextField
                  label="Bestand"
                  type="number"
                  value={row.stock ?? ''}
                  onChange={(event) => setCollectionField('stockEntries', index, 'stock', event.target.value)}
                  slotProps={{ htmlInput: { step: '0.001', min: 0 } }}
                />
                <TextField
                  label="Mindestbestand"
                  type="number"
                  value={row.minimumStock ?? ''}
                  onChange={(event) => setCollectionField('stockEntries', index, 'minimumStock', event.target.value)}
                  slotProps={{ htmlInput: { step: '0.001', min: 0 } }}
                />
                <Tooltip title="Lagerposition entfernen">
                  <IconButton aria-label="Lagerposition entfernen" color="error" size="small" onClick={() => removeCollectionRow('stockEntries', index)} sx={{ position: 'absolute', right: -8, top: -14 }}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
          <Button
            variant="outlined"
            onClick={() => addCollectionRow('stockEntries', { warehouseLocationId: '', warehouseLocation: '', stock: '0', minimumStock: '0' })}
            sx={{ alignSelf: 'flex-start' }}
          >
            + Lagerplatz
          </Button>
          {warehouseLocations.length === 0 && <Alert severity="warning">Es sind noch keine Lagerplätze angelegt.</Alert>}
        </Stack>
      );
    }
    if (section === 'purchasePrices') {
      return (
        <Stack spacing={2}>
          <Typography color="text.secondary">Historie der Einkaufspreise als Nettobeträge.</Typography>
          {(form.purchasePrices ?? []).map((row, index) => {
            const selectedSupplier = suppliers.find((supplier) => supplier.id === row.supplierAddressId) ?? null;
            return (
              <Box key={index} sx={{ ...fieldGrid, pb: 1.5, borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
                <Autocomplete
                  options={suppliers}
                  value={selectedSupplier}
                  getOptionLabel={supplierLabel}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  filterOptions={(options, state) => {
                    const term = state.inputValue.trim().toLocaleLowerCase('de');
                    if (!term) return options;
                    return options.filter((supplier) => [
                      addressName(supplier),
                      addressNumber(supplier.addressNumber),
                      supplier.customerNumber,
                      supplier.city,
                      supplier.email,
                    ].filter(Boolean).join(' ').toLocaleLowerCase('de').includes(term));
                  }}
                  noOptionsText="Keine passende Lieferantenadresse"
                  onChange={(_event, supplier) => setPurchasePriceSupplier(index, supplier)}
                  renderOption={(props, supplier) => (
                    <li {...props} key={supplier.id}>
                      <Box>
                        <Typography>{addressName(supplier)}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {addressNumber(supplier.addressNumber)} · {[supplier.postalCode, supplier.city].filter(Boolean).join(' ')}
                        </Typography>
                      </Box>
                    </li>
                  )}
                  renderInput={(params) => <TextField {...params} label="Lieferant suchen" placeholder="Firma, Adressnummer oder Ort eingeben" />}
                  sx={{ gridColumn: { sm: '1 / -1' } }}
                />
                <TextField label="EK netto" type="number" placeholder="0,00" value={row.netPrice ?? ''} onChange={(event) => setCollectionField('purchasePrices', index, 'netPrice', event.target.value)} slotProps={{ htmlInput: { step: '0.001', min: 0 } }} />
                <TextField label="Gültig ab" type="date" value={row.validFrom ?? ''} onChange={(event) => setCollectionField('purchasePrices', index, 'validFrom', event.target.value)} />
                <TextField label="Bemerkung" value={row.note ?? ''} onChange={(event) => setCollectionField('purchasePrices', index, 'note', event.target.value)} sx={{ gridColumn: { sm: '1 / -1' } }} />
                <Tooltip title="EK-Preis entfernen">
                  <IconButton aria-label="EK-Preis entfernen" color="error" size="small" onClick={() => removeCollectionRow('purchasePrices', index)} sx={{ position: 'absolute', right: -8, top: -14 }}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
          <Button variant="outlined" onClick={() => addCollectionRow('purchasePrices', { supplierAddressId: '', supplierName: '', supplierAddressNumber: '', netPrice: '', validFrom: new Date().toISOString().slice(0, 10), note: '' })} sx={{ alignSelf: 'flex-start' }}>
            + EK-Preis
          </Button>
          {suppliers.length === 0 && <Alert severity="warning">Es sind noch keine Adressen vom Typ Lieferant oder Kunde/Lieferant angelegt.</Alert>}
        </Stack>
      );
    }
    if (section === 'salePrices') {
      return (
        <Stack spacing={2}>
          <Typography color="text.secondary">Historie der Verkaufspreise als Nettobeträge.</Typography>
          {renderCollection('salePrices', [
            { key: 'netPrice', label: 'VK netto', type: 'number', placeholder: '0,00' },
            { key: 'validFrom', label: 'Gültig ab', type: 'date' },
            { key: 'note', label: 'Bemerkung' },
          ], { netPrice: '', validFrom: new Date().toISOString().slice(0, 10), note: '' }, 'VK-Preis')}
        </Stack>
      );
    }
    if (section === 'positions') {
      const availablePositionArticles = articles.filter((article) => article.id !== editing?.id);
      return (
        <Stack spacing={2}>
          <Alert severity="info">Positionen sind optional und können auch später ergänzt werden.</Alert>
          {(form.positions ?? []).map((row, index) => {
            const selectedArticle = availablePositionArticles.find((article) => article.articleNumber === row.articleNumber) ?? null;
            return (
              <Box key={index} sx={{ ...fieldGrid, pb: 1.5, borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
                <Autocomplete
                  options={availablePositionArticles}
                  value={selectedArticle}
                  inputValue={row.articleNumber ?? ''}
                  getOptionLabel={(article) => article.articleNumber}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  filterOptions={(options, state) => {
                    const term = state.inputValue.trim().toLocaleLowerCase('de');
                    return term ? options.filter((article) => article.articleNumber.toLocaleLowerCase('de').includes(term)) : options;
                  }}
                  noOptionsText="Keine passende Artikelnummer"
                  onInputChange={(_event, value, reason) => reason === 'input' && setPositionSearch(index, 'articleNumber', value)}
                  onChange={(_event, article) => setPositionArticle(index, article)}
                  renderOption={(props, article) => <li {...props} key={article.id}>{article.articleNumber} · {article.name}</li>}
                  renderInput={(params) => <TextField {...params} label="Artikelnummer suchen" placeholder="Artikelnummer eingeben" />}
                />
                <Autocomplete
                  options={availablePositionArticles}
                  value={selectedArticle}
                  inputValue={row.description ?? ''}
                  getOptionLabel={(article) => article.name}
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  filterOptions={(options, state) => {
                    const term = state.inputValue.trim().toLocaleLowerCase('de');
                    return term ? options.filter((article) => article.name.toLocaleLowerCase('de').includes(term)) : options;
                  }}
                  noOptionsText="Keine passende Bezeichnung"
                  onInputChange={(_event, value, reason) => reason === 'input' && setPositionSearch(index, 'description', value)}
                  onChange={(_event, article) => setPositionArticle(index, article)}
                  renderOption={(props, article) => <li {...props} key={article.id}>{article.name} · {article.articleNumber}</li>}
                  renderInput={(params) => <TextField {...params} label="Bezeichnung suchen" placeholder="Bezeichnung eingeben" />}
                />
                <TextField label="Menge" type="number" value={row.quantity ?? ''} onChange={(event) => setCollectionField('positions', index, 'quantity', event.target.value)} slotProps={{ htmlInput: { step: '0.001', min: 0 } }} />
                <TextField label="Einheit" value={row.unit ?? ''} slotProps={{ input: { readOnly: true } }} helperText="Wird vom Quellartikel übernommen" />
                <TextField label="Hinweis" value={row.note ?? ''} onChange={(event) => setCollectionField('positions', index, 'note', event.target.value)} />
                <Tooltip title="Position entfernen">
                  <IconButton aria-label="Position entfernen" color="error" size="small" onClick={() => removeCollectionRow('positions', index)} sx={{ position: 'absolute', right: -8, top: -14 }}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            );
          })}
          <Button variant="outlined" onClick={() => addCollectionRow('positions', { articleNumber: '', description: '', quantity: '1', unit: '', note: '' })} sx={{ alignSelf: 'flex-start' }}>
            + Position
          </Button>
        </Stack>
      );
    }
    if (section === 'production') {
      if (!editing) {
        return <Alert severity="info">Der Artikel muss zuerst gespeichert werden, bevor seine Verwendung ermittelt werden kann.</Alert>;
      }

      const articleNumber = editing.articleNumber.trim().toLocaleLowerCase('de');
      const usages = productionInstructions.flatMap((instruction) => {
        const productionArticle = articles.find((article) => article.id === instruction.articleId);
        const positions = (productionArticle?.positions ?? []).filter((position) =>
          position.articleNumber?.trim().toLocaleLowerCase('de') === articleNumber,
        );
        return positions.map((position) => ({ instruction, productionArticle, position }));
      });

      return (
        <Stack spacing={2}>
          <Typography color="text.secondary">
            Zeigt alle Produktionsanweisungen, in denen dieser Artikel als Position verwendet wird.
          </Typography>
          <TableContainer sx={{ borderTop: 1, borderColor: 'divider' }}>
            <Table size="small" aria-label="Verwendung in Produktionsanweisungen" sx={{ minWidth: 720 }}>
              <TableHead>
                <TableRow>
                  <TableCell>ANWEISUNG</TableCell>
                  <TableCell>PRODUKTIONSARTIKEL</TableCell>
                  <TableCell>BEZEICHNUNG</TableCell>
                  <TableCell>MENGE</TableCell>
                  <TableCell>TEILE / SCHRITTE</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usages.map(({ instruction, productionArticle, position }, index) => (
                  <TableRow key={`${instruction.id}-${index}`}>
                    <TableCell sx={{ color: 'primary.main' }}>{productionInstructionNumber(instruction.instructionNumber)}</TableCell>
                    <TableCell>{productionArticle?.articleNumber ?? instruction.article.articleNumber}</TableCell>
                    <TableCell>{instruction.name}</TableCell>
                    <TableCell>{position.quantity || '—'} {position.unit || ''}</TableCell>
                    <TableCell>{instruction.elementCount} / {instruction.stepCount}</TableCell>
                  </TableRow>
                ))}
                {!usages.length && (
                  <TableRow>
                    <TableCell colSpan={5} sx={{ py: 4, color: 'text.secondary' }}>
                      Dieser Artikel wird derzeit in keiner Produktionsanweisung verwendet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Stack>
      );
    }
    if (section === 'variants') {
      const availableArticles = articles.filter((article) => article.id !== editing?.id);
      const selectedVariants = availableArticles.filter((article) => form.variantIds.includes(article.id));
      return (
        <Stack spacing={2}>
          <Typography color="text.secondary">
            Verknüpft bestehende Artikel als Varianten. Die Artikeldaten bleiben dabei unabhängig voneinander.
          </Typography>
          <Autocomplete
            multiple
            options={availableArticles}
            value={selectedVariants}
            getOptionLabel={(article) => `${article.articleNumber} · ${article.name}`}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            filterSelectedOptions
            noOptionsText="Keine passenden Artikel"
            onChange={(_event, values) => setForm((current) => ({ ...current, variantIds: values.map((article) => article.id) }))}
            renderInput={(params) => <TextField {...params} label="Variantenartikel suchen" placeholder="Artikelnummer oder Bezeichnung" />}
          />
          {selectedVariants.length > 0 && (
            <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
              {selectedVariants.map((article) => (
                <Stack key={article.id} direction="row" alignItems="center" spacing={2} sx={{ py: 1, borderBottom: 1, borderColor: 'divider' }}>
                  <Typography sx={{ color: 'primary.main', minWidth: 130 }}>{article.articleNumber}</Typography>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography>{article.name}</Typography>
                    {editing?.variantLinks?.find((link) => link.variantArticleId === article.id)?.variantType && (
                      <Typography variant="caption" color="text.secondary">
                        {editing.variantLinks.find((link) => link.variantArticleId === article.id)?.variantType}
                      </Typography>
                    )}
                  </Box>
                  <Button color="error" onClick={() => setForm((current) => ({ ...current, variantIds: current.variantIds.filter((id) => id !== article.id) }))}>
                    Entfernen
                  </Button>
                </Stack>
              ))}
            </Box>
          )}
        </Stack>
      );
    }
    if (section === 'externalNumbers') {
      return renderCollection('externalNumbers', [
        { key: 'number', label: 'Fremdnummer' },
        { key: 'type', label: 'Typ', placeholder: 'z. B. EAN, Hersteller-Nr.' },
        { key: 'partner', label: 'Lieferant / Kunde' },
        { key: 'description', label: 'Beschreibung' },
      ], { number: '', type: '', partner: '', description: '' }, 'Fremdnummer');
    }
    if (section === 'files') {
      return (
        <Stack spacing={3}>
          <Box sx={{ border: 1, borderColor: 'divider', p: 2 }}>
            <Typography variant="h2">Produktabbildung</Typography>
            <Typography color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>Bilddatei bis maximal 2 MB.</Typography>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <Box sx={{ width: 160, height: 120, border: 1, borderColor: 'divider', display: 'grid', placeItems: 'center', overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.02)' }}>
                {productImage?.reference
                  ? <Box component="img" src={productImage.reference} alt={productImage.name || 'Produktabbildung'} sx={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                  : <Typography variant="caption" color="text.secondary">KEIN BILD</Typography>}
              </Box>
              <Stack spacing={1} alignItems="flex-start">
                {productImage && <Typography>{productImage.name}</Typography>}
                <Button component="label" variant="outlined">
                  {productImage ? 'Produktbild ersetzen' : 'Produktbild auswählen'}
                  <input hidden type="file" accept="image/*" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setProductImage(file);
                    event.target.value = '';
                  }} />
                </Button>
                {productImage && <Button color="error" onClick={removeProductImage}>Produktbild entfernen</Button>}
              </Stack>
            </Stack>
          </Box>

          <Box>
            <Typography variant="h2" sx={{ mb: 1.5 }}>Weitere Dateien</Typography>
            {(form.files ?? []).map((row, index) => row.category === PRODUCT_IMAGE_CATEGORY ? null : (
              <Box key={index} sx={{ ...fieldGrid, mb: 2, pb: 1.5, borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
                {[
                  { key: 'name', label: 'Dateiname' },
                  { key: 'category', label: 'Dokumentart', placeholder: 'z. B. Datenblatt' },
                  { key: 'reference', label: 'Datei / Ablageort' },
                  { key: 'version', label: 'Version' },
                  { key: 'date', label: 'Datum', type: 'date' },
                  { key: 'description', label: 'Beschreibung' },
                ].map((field) => (
                  <TextField key={field.key} label={field.label} type={field.type} placeholder={field.placeholder} value={row[field.key] ?? ''} onChange={(event) => setCollectionField('files', index, field.key, event.target.value)} />
                ))}
                <Tooltip title="Datei entfernen">
                  <IconButton aria-label="Datei entfernen" color="error" size="small" onClick={() => removeCollectionRow('files', index)} sx={{ position: 'absolute', right: -8, top: -14 }}>
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            ))}
            <Button variant="outlined" onClick={() => addCollectionRow('files', { name: '', category: '', reference: '', version: '', date: '', description: '' })}>
              + Datei
            </Button>
          </Box>
        </Stack>
      );
    }
    if (section === 'purchasing') {
      return (
        <Box sx={fieldGrid}>
          <TextField label="Standardlieferant" value={form.purchasing?.supplier ?? ''} onChange={(event) => setPurchasingField('supplier', event.target.value)} />
          <TextField label="Lieferantenartikelnummer" value={form.purchasing?.supplierArticleNumber ?? ''} onChange={(event) => setPurchasingField('supplierArticleNumber', event.target.value)} />
          <TextField label="Einkaufseinheit" value={form.purchasing?.purchaseUnit ?? ''} onChange={(event) => setPurchasingField('purchaseUnit', event.target.value)} />
          <TextField label="Mindestbestellmenge" type="number" value={form.purchasing?.minimumOrderQuantity ?? ''} onChange={(event) => setPurchasingField('minimumOrderQuantity', event.target.value)} />
          <TextField label="Verpackungseinheit" value={form.purchasing?.packagingUnit ?? ''} onChange={(event) => setPurchasingField('packagingUnit', event.target.value)} />
          <TextField label="Lieferzeit (Tage)" type="number" value={form.purchasing?.deliveryTimeDays ?? ''} onChange={(event) => setPurchasingField('deliveryTimeDays', event.target.value)} />
          <TextField multiline minRows={3} label="Bestellhinweise" value={form.purchasing?.orderNote ?? ''} onChange={(event) => setPurchasingField('orderNote', event.target.value)} sx={{ gridColumn: { sm: '1 / -1' } }} />
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 220px' }, gap: 3, alignItems: 'start' }}>
        <Box sx={fieldGrid}>
        <TextField
          required
          label="Artikelnummer"
          placeholder="z. B. ART-000001"
          value={form.articleNumber}
          onChange={(event) => setField('articleNumber', event.target.value)}
          helperText={!editing && form.useAutomaticArticleNumber ? 'Wird automatisch aus dem Nummernkreis vergeben' : undefined}
          slotProps={!editing && form.useAutomaticArticleNumber ? { input: { readOnly: true } } : undefined}
        />
        <TextField select required label="Artikeltyp" value={form.type} onChange={(event) => setArticleType(event.target.value as ArticleType)}>
          {Object.entries(typeLabels).map(([value, label]) => <MenuItem key={value} value={value}>{label}</MenuItem>)}
        </TextField>
        <TextField required label="Bezeichnung" value={form.name} onChange={(event) => setField('name', event.target.value)} sx={{ gridColumn: { sm: '1 / -1' } }} />
        <TextField select label="Einheit" value={form.unitId} onChange={(event) => setField('unitId', event.target.value)}>
          {units.map((unit) => <MenuItem key={unit.id} value={unit.id}>{unit.name}</MenuItem>)}
        </TextField>
        <Box />
        <TextField select label="Mehrwertsteuer" value={form.vatRate} onChange={(event) => setField('vatRate', event.target.value)} helperText="Wird später über Einstellungen verwaltet">
          <MenuItem value="19">19 %</MenuItem>
          <MenuItem value="7">7 %</MenuItem>
          <MenuItem value="0">0 %</MenuItem>
        </TextField>
        <Box />
        <Typography variant="overline" color="text.secondary" sx={{ gridColumn: { sm: '1 / -1' }, mt: 1 }}>GEWICHTE UND ABMESSUNGEN</Typography>
        <TextField
          label="Nettogewicht ohne Verpackung (kg)"
          type="number"
          value={form.netWeightKg ?? ''}
          onChange={(event) => setField('netWeightKg', event.target.value)}
          slotProps={{ htmlInput: { min: 0, step: '0.001' } }}
        />
        <TextField
          label="Bruttogewicht mit Verpackung (kg)"
          type="number"
          value={form.grossWeightKg ?? ''}
          onChange={(event) => setField('grossWeightKg', event.target.value)}
          slotProps={{ htmlInput: { min: 0, step: '0.001' } }}
        />
        <TextField label="Länge (cm)" type="number" value={form.lengthCm ?? ''} onChange={(event) => setField('lengthCm', event.target.value)} slotProps={{ htmlInput: { min: 0.001, step: '0.001' } }} />
        <TextField label="Breite (cm)" type="number" value={form.widthCm ?? ''} onChange={(event) => setField('widthCm', event.target.value)} slotProps={{ htmlInput: { min: 0.001, step: '0.001' } }} />
        <TextField label="Höhe (cm)" type="number" value={form.heightCm ?? ''} onChange={(event) => setField('heightCm', event.target.value)} slotProps={{ htmlInput: { min: 0.001, step: '0.001' } }} />
        <Box />
          <TextField multiline minRows={3} label="Notizen" value={form.notes ?? ''} onChange={(event) => setField('notes', event.target.value)} sx={{ gridColumn: { sm: '1 / -1' } }} />
        </Box>
        <Box sx={{ border: 1, borderColor: 'divider', minHeight: 180, p: 1, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="overline" color="text.secondary">PRODUKTABBILDUNG</Typography>
          <Box sx={{ flexGrow: 1, minHeight: 140, display: 'grid', placeItems: 'center', overflow: 'hidden', bgcolor: 'rgba(255,255,255,0.02)' }}>
            {productImage?.reference
              ? <Box component="img" src={productImage.reference} alt={productImage.name || 'Produktabbildung'} sx={{ width: '100%', height: 180, objectFit: 'contain' }} />
              : <Typography variant="caption" color="text.secondary" align="center">KEINE PRODUKTABBILDUNG<br />UNTER DATEIEN HINTERLEGT</Typography>}
          </Box>
        </Box>
      </Box>
    );
  };

  return (
    <Stack spacing={3}>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: 'auto minmax(0, 1fr)', md: 'auto minmax(280px, 1fr) auto' }, gap: 1.5, alignItems: 'center' }}>
        <Typography variant="h1" sx={{ whiteSpace: 'nowrap' }}>Artikel</Typography>
        <TextField fullWidth size="small" label="Artikel durchsuchen" value={search} onChange={(event) => setSearch(event.target.value)} />
        <Button variant="contained" onClick={startCreate} sx={{ whiteSpace: 'nowrap', px: 2.5, gridColumn: { xs: '1 / -1', md: 'auto' } }}>
          Artikel anlegen
        </Button>
      </Box>

      {error && !open && <Alert severity="error">{error}</Alert>}

      <Box>
        <Typography variant="overline" color="text.secondary">
          {loading ? 'ARTIKEL WERDEN GELADEN' : `${filteredArticles.length} VON ${articles.length} ARTIKELN`}
        </Typography>
        <TableContainer sx={{ mt: 1, borderTop: 1, borderColor: 'divider' }}>
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead><TableRow>
              <TableCell>ARTIKELNUMMER</TableCell><TableCell>BEZEICHNUNG</TableCell><TableCell>TYP</TableCell>
              <TableCell align="right">BESTAND</TableCell><TableCell>MWST.</TableCell><TableCell align="right">POSITIONEN</TableCell>
            </TableRow></TableHead>
            <TableBody>
              {!loading && filteredArticles.length === 0 && <TableRow><TableCell colSpan={6} sx={{ py: 4, color: 'text.secondary' }}>Keine passenden Artikel vorhanden.</TableCell></TableRow>}
              {filteredArticles.map((article) => (
                <TableRow key={article.id} hover role="button" tabIndex={0} onClick={() => void startEdit(article)} onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && void startEdit(article)} sx={{ cursor: 'pointer' }}>
                  <TableCell sx={{ color: 'primary.main' }}>{article.articleNumber}</TableCell>
                  <TableCell>{article.name}</TableCell>
                  <TableCell sx={{ color: typeTextColors[article.type] ?? 'warning.main' }}>{typeLabels[article.type]}</TableCell>
                  <TableCell align="right">{article.stock}</TableCell>
                  <TableCell>{article.vatRate} %</TableCell>
                  <TableCell align="right">{article.positions?.length ?? 0}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>

      <Dialog open={open} onClose={() => !saving && setOpen(false)} fullWidth maxWidth="lg">
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>{editing ? `ARTIKEL ${editing.articleNumber}` : 'ARTIKEL ANLEGEN'}</Box>
          <Tooltip title="Speichern"><span><IconButton color="primary" aria-label="Artikel speichern" onClick={() => void save()} disabled={saving}><SaveOutlined /></IconButton></span></Tooltip>
          <Tooltip title="Schließen"><span><IconButton color="warning" aria-label="Fenster schließen" onClick={() => setOpen(false)} disabled={saving}><CloseOutlined /></IconButton></span></Tooltip>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '210px minmax(0, 1fr)' }, minHeight: 560 }}>
            <Box component="nav" aria-label="Artikelbereiche" sx={{ borderRight: { md: 1 }, borderBottom: { xs: 1, md: 0 }, borderColor: 'divider', py: 1 }}>
              {sections.map((entry) => (
                <Button key={entry.id} fullWidth onClick={() => setSection(entry.id)} sx={{ justifyContent: 'flex-start', px: 2, color: section === entry.id ? 'warning.main' : 'text.secondary' }}>
                  {section === entry.id ? '> ' : '  '}{entry.label}
                </Button>
              ))}
            </Box>
            <Box sx={{ p: { xs: 2, md: 3 }, overflow: 'auto' }}>
              <Typography variant="h2" sx={{ mb: 2 }}>{sections.find((entry) => entry.id === section)?.label}</Typography>
              {renderSection()}
            </Box>
          </Box>
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
