import { useDeferredValue, useEffect, useState } from 'react';
import {
  Alert,
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
  TablePagination,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { CloseOutlined, SaveOutlined } from '@mui/icons-material';
import {
  createAddress,
  listAddresses,
  listSpecifications,
  updateAddress,
  type Address,
  type CreateAddressInput,
  type Specification,
} from '../../api/client';

type Section = 'master' | 'delivery' | 'bank' | 'contacts' | 'documents' | 'items';
type Collection = 'deliveryAddresses' | 'contacts' | 'documents' | 'purchasedItems';

const sections: { id: Section; label: string }[] = [
  { id: 'master', label: 'Stammdaten' },
  { id: 'delivery', label: 'Lieferadressen' },
  { id: 'bank', label: 'Bankdaten' },
  { id: 'contacts', label: 'Ansprechpartner' },
  { id: 'documents', label: 'Dokumente' },
  { id: 'items', label: 'Gekaufte Artikel' },
];

const emptyForm = (): CreateAddressInput => ({
  customerNumber: '',
  type: 'KUNDE',
  company: '',
  salutation: '',
  firstName: '',
  lastName: '',
  street: '',
  houseNumber: '',
  postalCode: '',
  city: '',
  country: 'Deutschland',
  email: '',
  phone: '',
  mobile: '',
  website: '',
  taxNumber: '',
  notes: '',
  specificationId: '',
  bankData: { accountHolder: '', bankName: '', iban: '', bic: '' },
  deliveryAddresses: [{ label: '', company: '', contactPerson: '', street: '', houseNumber: '', postalCode: '', city: '', country: 'Deutschland', phone: '', notes: '' }],
  contacts: [{ name: '', role: '', email: '', phone: '' }],
  documents: [{ title: '', category: '', reference: '', date: '' }],
  purchasedItems: [{ articleNumber: '', description: '', quantity: '', lastPurchaseDate: '' }],
});

const fieldGrid = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))' },
  columnGap: 1.5,
  rowGap: 1.25,
};

export function AddressOverviewPage() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(100);
  const [reloadKey, setReloadKey] = useState(0);
  const [specifications, setSpecifications] = useState<Specification[]>([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [section, setSection] = useState<Section>('master');
  const [form, setForm] = useState<CreateAddressInput>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    listSpecifications()
      .then(setSpecifications)
      .catch((reason: Error) => setError(reason.message))
  }, []);

  useEffect(() => {
    let active = true;
    setLoading(true);
    listAddresses({ page: page + 1, pageSize, search: deferredSearch })
      .then((result) => {
        if (!active) return;
        setAddresses(result.items);
        setTotal(result.total);
      })
      .catch((reason: Error) => active && setError(reason.message))
      .finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [deferredSearch, page, pageSize, reloadKey]);

  const setField = (field: keyof CreateAddressInput, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const setBankField = (field: string, value: string) => {
    setForm((current) => ({ ...current, bankData: { ...current.bankData, [field]: value } }));
  };

  const setCollectionField = (collection: Collection, index: number, field: string, value: string) => {
    setForm((current) => ({
      ...current,
      [collection]: (current[collection] ?? []).map((row, rowIndex) => rowIndex === index ? { ...row, [field]: value } : row),
    }));
  };

  const addCollectionRow = (collection: Collection, row: Record<string, string>) => {
    setForm((current) => ({ ...current, [collection]: [...(current[collection] ?? []), row] }));
  };

  const startCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setSection('master');
    setError(null);
    setOpen(true);
  };

  const startEdit = (address: Address) => {
    const { id: _id, addressNumber: _addressNumber, createdAt: _createdAt, updatedAt: _updatedAt, specification: _specification, ...values } = address;
    setEditing(address);
    setForm({
      ...emptyForm(),
      ...values,
      bankData: values.bankData ?? emptyForm().bankData,
      deliveryAddresses: values.deliveryAddresses?.length ? values.deliveryAddresses : emptyForm().deliveryAddresses,
      contacts: values.contacts?.length ? values.contacts : emptyForm().contacts,
      documents: values.documents?.length ? values.documents : emptyForm().documents,
      purchasedItems: values.purchasedItems?.length ? values.purchasedItems : emptyForm().purchasedItems,
    });
    setSection('master');
    setError(null);
    setOpen(true);
  };

  const closeEditor = () => {
    if (!saving) setOpen(false);
  };

  const save = async () => {
    if (!form.company?.trim() && !form.lastName?.trim()) {
      setSection('master');
      setError('Bitte Firma oder Nachname angeben.');
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const cleanRows = (rows: Record<string, string>[] | null | undefined) =>
        (rows ?? []).filter((row) => Object.values(row).some((value) => value.trim()));
      const cleanDeliveryAddresses = (form.deliveryAddresses ?? []).filter((row) =>
        Object.entries(row).some(([field, value]) => field !== 'country' && value.trim()),
      );
      const input = {
        ...form,
        deliveryAddresses: cleanDeliveryAddresses,
        contacts: cleanRows(form.contacts),
        documents: cleanRows(form.documents),
        purchasedItems: cleanRows(form.purchasedItems),
      };
      await (editing
        ? updateAddress(editing.id, input)
        : createAddress(input));
      setReloadKey((current) => current + 1);
      setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Adresse konnte nicht gespeichert werden.');
    } finally {
      setSaving(false);
    }
  };

  const renderCollection = (
    collection: Collection,
    fields: { key: string; label: string; type?: string }[],
    emptyRow: Record<string, string>,
    addLabel: string,
  ) => (
    <Stack spacing={2}>
      {(form[collection] ?? []).map((row, index) => (
        <Box key={index} sx={{ ...fieldGrid, pb: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          {fields.map((field) => (
            <TextField
              key={field.key}
              label={field.label}
              type={field.type}
              value={row[field.key] ?? ''}
              onChange={(event) => setCollectionField(collection, index, field.key, event.target.value)}
            />
          ))}
        </Box>
      ))}
      <Button variant="outlined" onClick={() => addCollectionRow(collection, emptyRow)} sx={{ alignSelf: 'flex-start' }}>
        + {addLabel}
      </Button>
    </Stack>
  );

  const renderSection = () => {
    if (section === 'delivery') {
      return renderCollection('deliveryAddresses', [
        { key: 'label', label: 'Bezeichnung' },
        { key: 'company', label: 'Firma / Empfänger' },
        { key: 'contactPerson', label: 'Ansprechpartner' },
        { key: 'street', label: 'Straße' },
        { key: 'houseNumber', label: 'Hausnummer' },
        { key: 'postalCode', label: 'PLZ' },
        { key: 'city', label: 'Ort' },
        { key: 'country', label: 'Land' },
        { key: 'phone', label: 'Telefon' },
        { key: 'notes', label: 'Hinweise' },
      ], { label: '', company: '', contactPerson: '', street: '', houseNumber: '', postalCode: '', city: '', country: 'Deutschland', phone: '', notes: '' }, 'Lieferadresse');
    }
    if (section === 'bank') {
      return (
        <Box sx={fieldGrid}>
          <TextField label="Kontoinhaber" value={form.bankData?.accountHolder ?? ''} onChange={(event) => setBankField('accountHolder', event.target.value)} />
          <TextField label="Bank" value={form.bankData?.bankName ?? ''} onChange={(event) => setBankField('bankName', event.target.value)} />
          <TextField label="IBAN" value={form.bankData?.iban ?? ''} onChange={(event) => setBankField('iban', event.target.value)} />
          <TextField label="BIC" value={form.bankData?.bic ?? ''} onChange={(event) => setBankField('bic', event.target.value)} />
        </Box>
      );
    }
    if (section === 'contacts') {
      return renderCollection('contacts', [
        { key: 'name', label: 'Name' },
        { key: 'role', label: 'Funktion' },
        { key: 'email', label: 'E-Mail', type: 'email' },
        { key: 'phone', label: 'Telefon' },
      ], { name: '', role: '', email: '', phone: '' }, 'Ansprechpartner');
    }
    if (section === 'documents') {
      return renderCollection('documents', [
        { key: 'title', label: 'Bezeichnung' },
        { key: 'category', label: 'Dokumentart' },
        { key: 'reference', label: 'Referenz / Ablageort' },
        { key: 'date', label: 'Datum', type: 'date' },
      ], { title: '', category: '', reference: '', date: '' }, 'Dokumentverweis');
    }
    if (section === 'items') {
      return renderCollection('purchasedItems', [
        { key: 'articleNumber', label: 'Artikelnummer' },
        { key: 'description', label: 'Bezeichnung' },
        { key: 'quantity', label: 'Menge', type: 'number' },
        { key: 'lastPurchaseDate', label: 'Letzter Kauf', type: 'date' },
      ], { articleNumber: '', description: '', quantity: '', lastPurchaseDate: '' }, 'Artikel');
    }

    return (
      <Box sx={fieldGrid}>
        <TextField select label="Adressart" value={form.type} onChange={(event) => setField('type', event.target.value)}>
          <MenuItem value="KUNDE">Kunde</MenuItem>
          <MenuItem value="LIEFERANT">Lieferant</MenuItem>
          <MenuItem value="BEIDES">Kunde und Lieferant</MenuItem>
        </TextField>
        <TextField select label="Spezifikation" value={form.specificationId ?? ''} onChange={(event) => setField('specificationId', event.target.value)}>
          <MenuItem value="">Keine Spezifikation</MenuItem>
          {specifications.map((specification) => <MenuItem key={specification.id} value={specification.id}>{specification.name}</MenuItem>)}
        </TextField>
        <TextField label="Kunden-/Lieferantennummer" value={form.customerNumber ?? ''} onChange={(event) => setField('customerNumber', event.target.value)} />
        <Box />
        <TextField label="Firma" value={form.company ?? ''} onChange={(event) => setField('company', event.target.value)} sx={{ gridColumn: { sm: '1 / -1' } }} />
        <TextField label="Anrede" value={form.salutation ?? ''} onChange={(event) => setField('salutation', event.target.value)} />
        <Box />
        <TextField label="Vorname" value={form.firstName ?? ''} onChange={(event) => setField('firstName', event.target.value)} />
        <TextField label="Nachname" value={form.lastName ?? ''} onChange={(event) => setField('lastName', event.target.value)} />
        <TextField label="Straße" value={form.street ?? ''} onChange={(event) => setField('street', event.target.value)} />
        <TextField label="Hausnummer" value={form.houseNumber ?? ''} onChange={(event) => setField('houseNumber', event.target.value)} />
        <TextField label="PLZ" value={form.postalCode ?? ''} onChange={(event) => setField('postalCode', event.target.value)} />
        <TextField label="Ort" value={form.city ?? ''} onChange={(event) => setField('city', event.target.value)} />
        <TextField label="Land" value={form.country} onChange={(event) => setField('country', event.target.value)} />
        <TextField label="Steuernummer" value={form.taxNumber ?? ''} onChange={(event) => setField('taxNumber', event.target.value)} />
        <TextField label="E-Mail" type="email" value={form.email ?? ''} onChange={(event) => setField('email', event.target.value)} />
        <TextField label="Telefon" value={form.phone ?? ''} onChange={(event) => setField('phone', event.target.value)} />
        <TextField label="Mobil" value={form.mobile ?? ''} onChange={(event) => setField('mobile', event.target.value)} />
        <TextField label="Webseite" value={form.website ?? ''} onChange={(event) => setField('website', event.target.value)} />
        <TextField multiline minRows={3} label="Notizen" value={form.notes ?? ''} onChange={(event) => setField('notes', event.target.value)} sx={{ gridColumn: { sm: '1 / -1' } }} />
      </Box>
    );
  };

  return (
    <Stack
      spacing={3}
      sx={{
        height: { xs: 'calc(100% + 16px)', md: 'calc(100% + 32px)' },
        minHeight: 0,
        overflow: 'hidden',
      }}
    >
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: 'auto minmax(0, 1fr)', md: 'auto minmax(280px, 1fr) auto' },
          gap: 1.5,
          alignItems: 'center',
        }}
      >
        <Typography variant="h1" sx={{ whiteSpace: 'nowrap' }}>Adressen</Typography>
        <TextField
          fullWidth
          size="small"
          label="Adressen durchsuchen"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(0);
          }}
        />
        <Button
          variant="contained"
          onClick={startCreate}
          sx={{ whiteSpace: 'nowrap', px: 2.5, gridColumn: { xs: '1 / -1', md: 'auto' } }}
        >
          Adresse anlegen
        </Button>
      </Box>

      {error && !open && <Alert severity="error">{error}</Alert>}

      <Box sx={{ flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' }}>
        <TableContainer sx={{ borderTop: 1, borderColor: 'divider', flex: 1, minHeight: 240 }}>
          <Table stickyHeader size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>ADRESS-NR.</TableCell>
                <TableCell>NAME / FIRMA</TableCell>
                <TableCell>ANSCHRIFT</TableCell>
                <TableCell>KONTAKT</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {!loading && addresses.length === 0 && (
                <TableRow><TableCell colSpan={4} sx={{ py: 4, color: 'text.secondary' }}>Keine passenden Adressen vorhanden.</TableCell></TableRow>
              )}
              {addresses.map((address) => (
                <TableRow
                  key={address.id}
                  hover
                  role="button"
                  tabIndex={0}
                  aria-label={`Adresse ${address.addressNumber} öffnen`}
                  onClick={() => startEdit(address)}
                  onKeyDown={(event) => (event.key === 'Enter' || event.key === ' ') && startEdit(address)}
                  sx={{ cursor: 'pointer' }}
                >
                  <TableCell sx={{ color: 'primary.main' }}>ADR-{String(address.addressNumber).padStart(6, '0')}</TableCell>
                  <TableCell>
                    <Typography>{address.company || [address.firstName, address.lastName].filter(Boolean).join(' ')}</Typography>
                    {address.company && (address.firstName || address.lastName) && (
                      <Typography variant="caption" color="text.secondary">{[address.firstName, address.lastName].filter(Boolean).join(' ')}</Typography>
                    )}
                  </TableCell>
                  <TableCell>{[address.street, address.houseNumber, address.postalCode, address.city].filter(Boolean).join(' ') || '—'}</TableCell>
                  <TableCell>
                    <Typography>{address.email || '—'}</Typography>
                    <Typography variant="caption" color="text.secondary">{address.phone || address.mobile || ''}</Typography>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        <Box
          sx={{
            flexShrink: 0,
            height: 34,
            minHeight: 34,
            display: 'flex',
            alignItems: 'center',
            bgcolor: 'background.paper',
            borderTop: 1,
            borderColor: 'divider',
            overflow: 'hidden',
          }}
        >
          <Typography variant="overline" color="text.secondary" sx={{ pl: 1, flexShrink: 0 }}>
            {loading
              ? 'ADRESSEN WERDEN GELADEN'
              : total === 0
                ? '0 ADRESSEN'
                : `ADRESSEN ${page * pageSize + 1}–${page * pageSize + addresses.length} VON ${total}`}
          </Typography>
          <TablePagination
            component="div"
            count={total}
            page={page}
            onPageChange={(_event, nextPage) => setPage(nextPage)}
            rowsPerPage={pageSize}
            onRowsPerPageChange={(event) => {
              setPageSize(Number(event.target.value));
              setPage(0);
            }}
            rowsPerPageOptions={[10, 50, 100, 200, 500, 1000]}
            labelRowsPerPage="Einträge pro Seite:"
            labelDisplayedRows={({ page: currentPage, count }) =>
              `Seite ${currentPage + 1} von ${Math.max(1, Math.ceil(count / pageSize))} · ${count} Adressen`
            }
            showFirstButton
            showLastButton
            sx={{
              flex: 1,
              minWidth: 0,
              height: 33,
              minHeight: 33,
              p: 0,
              border: 0,
              overflow: 'hidden',
              '& .MuiTablePagination-toolbar': {
                height: 33,
                minHeight: '33px !important',
                p: 0,
                flexWrap: 'nowrap',
                justifyContent: 'flex-end',
              },
              '& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows': { m: 0, lineHeight: 1 },
              '& .MuiTablePagination-select': { py: 0 },
              '& .MuiTablePagination-actions': { ml: 1 },
              '& .MuiTablePagination-actions .MuiIconButton-root': { width: 30, height: 30, p: 0.25 },
            }}
          />
        </Box>
      </Box>

      <Dialog open={open} onClose={closeEditor} fullWidth maxWidth="lg">
        <DialogTitle sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center', gap: 2 }}>
          <Box sx={{ flexGrow: 1 }}>
            {editing ? `ADRESSE ADR-${String(editing.addressNumber).padStart(6, '0')}` : 'ADRESSE ANLEGEN'}
          </Box>
          <Tooltip title="Speichern">
            <span>
              <IconButton color="primary" aria-label="Adresse speichern" onClick={() => void save()} disabled={saving}>
                <SaveOutlined />
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Schließen">
            <span>
              <IconButton color="warning" aria-label="Fenster schließen" onClick={closeEditor} disabled={saving}>
                <CloseOutlined />
              </IconButton>
            </span>
          </Tooltip>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}
          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '210px minmax(0, 1fr)' }, minHeight: 520 }}>
            <Box component="nav" aria-label="Adressbereiche" sx={{ borderRight: { md: 1 }, borderBottom: { xs: 1, md: 0 }, borderColor: 'divider', py: 1 }}>
              {sections.map((entry) => (
                <Button
                  key={entry.id}
                  fullWidth
                  onClick={() => setSection(entry.id)}
                  sx={{ justifyContent: 'flex-start', px: 2, color: section === entry.id ? 'warning.main' : 'text.secondary' }}
                >
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
