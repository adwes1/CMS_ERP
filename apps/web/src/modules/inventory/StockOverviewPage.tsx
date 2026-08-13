import { useDeferredValue, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Chip,
  LinearProgress,
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
import { listArticles, type Article } from '../../api/client';

type StockEntry = {
  stock?: string;
  minimumStock?: string;
};

type PurchasePrice = {
  netPrice?: string;
  validFrom?: string;
};

type StockRow = {
  article: Article;
  stock: number;
  minimumStock: number;
  purchasePrice: number | null;
  inventoryValue: number | null;
};

const numberFormat = new Intl.NumberFormat('de-DE', { maximumFractionDigits: 3 });
const currencyFormat = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });

const numericValue = (value: string | undefined) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

export const currentPurchasePrice = (article: Article, today = new Date()) => {
  const date = today.toISOString().slice(0, 10);
  const prices = (article.purchasePrices ?? []) as PurchasePrice[];
  const applicablePrices = prices
    .filter((price) => price.validFrom && price.validFrom <= date && Number.isFinite(Number(price.netPrice)))
    .sort((a, b) => (b.validFrom ?? '').localeCompare(a.validFrom ?? ''));
  return applicablePrices.length ? Number(applicablePrices[0].netPrice) : null;
};

export const stockRow = (article: Article, today = new Date()): StockRow => {
  const entries = (article.stockEntries ?? []) as StockEntry[];
  const stock = numericValue(article.stock);
  const minimumStock = entries.reduce((total, entry) => total + numericValue(entry.minimumStock), 0);
  const purchasePrice = currentPurchasePrice(article, today);
  return {
    article,
    stock,
    minimumStock,
    purchasePrice,
    inventoryValue: purchasePrice === null ? null : stock * purchasePrice,
  };
};

function Metric({ label, value, detail, color = 'primary.main' }: {
  label: string;
  value: string;
  detail: string;
  color?: string;
}) {
  return (
    <Box sx={{ border: 1, borderColor: 'divider', p: 2, minWidth: 0 }}>
      <Typography variant="overline" color="text.secondary">{label}</Typography>
      <Typography sx={{ mt: 0.5, color, fontSize: 'clamp(1.5rem, 4vw, 2.35rem)', lineHeight: 1.1, overflowWrap: 'anywhere' }}>
        {value}
      </Typography>
      <Typography variant="caption" color="text.secondary">{detail}</Typography>
    </Box>
  );
}

export function StockOverviewPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const deferredSearch = useDeferredValue(search);

  useEffect(() => {
    listArticles()
      .then(setArticles)
      .catch((reason: Error) => setError(reason.message))
      .finally(() => setLoading(false));
  }, []);

  const rows = useMemo(() => articles.map((article) => stockRow(article)), [articles]);
  const productsInStock = rows.filter((row) => row.stock > 0).length;
  const totalStock = rows.reduce((total, row) => total + row.stock, 0);
  const inventoryValue = rows.reduce((total, row) => total + (row.inventoryValue ?? 0), 0);
  const unvaluedProducts = rows.filter((row) => row.stock > 0 && row.purchasePrice === null).length;

  const criticalRows = useMemo(() => {
    const term = deferredSearch.trim().toLocaleLowerCase('de');
    return rows
      .filter((row) => row.stock === 0 || row.stock < row.minimumStock)
      .filter((row) => !term || [row.article.articleNumber, row.article.name]
        .join(' ').toLocaleLowerCase('de').includes(term))
      .sort((a, b) => Number(a.stock > 0) - Number(b.stock > 0)
        || (b.minimumStock - b.stock) - (a.minimumStock - a.stock)
        || a.article.articleNumber.localeCompare(b.article.articleNumber, 'de', { numeric: true }));
  }, [deferredSearch, rows]);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">LAGER · AUSWERTUNG</Typography>
        <Typography variant="h1">Bestände</Typography>
        <Typography color="text.secondary" sx={{ mt: 0.75 }}>
          Aktueller Lagerbestand und Warenwert auf Basis des heute gültigen EK-Nettopreises.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {loading && <LinearProgress aria-label="Bestände werden geladen" />}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0, 1fr))', xl: 'repeat(4, minmax(0, 1fr))' }, gap: 1.5 }}>
        <Metric
          label="ARTIKEL AUF LAGER"
          value={numberFormat.format(productsInStock)}
          detail={`von ${numberFormat.format(rows.length)} angelegten Artikeln`}
        />
        <Metric
          label="BESTAND GESAMT"
          value={numberFormat.format(totalStock)}
          detail="Bestandseinheiten über alle Artikel"
        />
        <Metric
          label="WARENBESTAND (EK)"
          value={currencyFormat.format(inventoryValue)}
          detail="Bestand × aktuell gültiger EK netto"
          color="success.main"
        />
        <Metric
          label="KRITISCHE ARTIKEL"
          value={numberFormat.format(rows.filter((row) => row.stock === 0 || row.stock < row.minimumStock).length)}
          detail="unter Mindestbestand oder ausverkauft"
          color="warning.main"
        />
      </Box>

      {unvaluedProducts > 0 && (
        <Alert severity="warning">
          {unvaluedProducts === 1 ? 'Ein lagernder Artikel' : `${unvaluedProducts} lagernde Artikel`} ohne aktuell gültigen EK
          {unvaluedProducts === 1 ? ' ist' : ' sind'} nicht im Warenwert enthalten.
        </Alert>
      )}

      <Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) minmax(260px, 420px)' }, gap: 1.5, alignItems: 'end' }}>
          <Box>
            <Typography variant="overline" color="warning.main">HANDLUNGSBEDARF</Typography>
            <Typography variant="h2">Artikel unter Mindestbestand</Typography>
          </Box>
          <TextField
            label="Kritische Artikel durchsuchen"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Box>

        <TableContainer sx={{ mt: 1.5, borderTop: 1, borderColor: 'divider' }}>
          <Table size="small" aria-label="Artikel unter Mindestbestand" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>STATUS</TableCell>
                <TableCell>ARTIKELNR.</TableCell>
                <TableCell>BEZEICHNUNG</TableCell>
                <TableCell align="right">BESTAND</TableCell>
                <TableCell align="right">MINDESTBESTAND</TableCell>
                <TableCell align="right">FEHLMENGE</TableCell>
                <TableCell align="right">EK / EINHEIT</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {criticalRows.map((row) => {
                const outOfStock = row.stock === 0;
                return (
                  <TableRow key={row.article.id} hover>
                    <TableCell>
                      <Chip
                        label={outOfStock ? '0 BESTAND' : 'UNTER MIN.'}
                        color={outOfStock ? 'error' : 'warning'}
                        variant="outlined"
                        size="small"
                      />
                    </TableCell>
                    <TableCell sx={{ color: 'primary.main', whiteSpace: 'nowrap' }}>{row.article.articleNumber}</TableCell>
                    <TableCell>{row.article.name}</TableCell>
                    <TableCell align="right" sx={{ color: outOfStock ? 'error.main' : 'warning.main' }}>
                      {numberFormat.format(row.stock)} {row.article.unit.name}
                    </TableCell>
                    <TableCell align="right">{numberFormat.format(row.minimumStock)} {row.article.unit.name}</TableCell>
                    <TableCell align="right">{numberFormat.format(Math.max(0, row.minimumStock - row.stock))} {row.article.unit.name}</TableCell>
                    <TableCell align="right">{row.purchasePrice === null ? '—' : currencyFormat.format(row.purchasePrice)}</TableCell>
                  </TableRow>
                );
              })}
              {!loading && criticalRows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} sx={{ py: 4, color: 'text.secondary', textAlign: 'center' }}>
                    {search.trim() ? 'Keine passenden kritischen Artikel gefunden.' : 'Alle Artikel liegen mindestens auf ihrem Mindestbestand.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Stack>
  );
}
