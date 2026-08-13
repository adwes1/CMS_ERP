import { useEffect, useState } from 'react';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import {
  createPaymentMethod,
  deletePaymentMethod,
  listPaymentMethods,
  type PaymentMethod,
} from '../../api/client';

type Props = { canManage: boolean };

export function PaymentMethodsPage({ canManage }: Props) {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listPaymentMethods().then(setPaymentMethods).catch((reason: Error) => setError(reason.message));
  }, []);

  const add = async () => {
    if (!name.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const created = await createPaymentMethod(name);
      setPaymentMethods((current) => [...current, created].sort((a, b) => a.name.localeCompare(b.name, 'de')));
      setName('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Zahlungsart konnte nicht angelegt werden.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (paymentMethod: PaymentMethod) => {
    setSaving(true);
    setError(null);
    try {
      await deletePaymentMethod(paymentMethod.id);
      setPaymentMethods((current) => current.filter((entry) => entry.id !== paymentMethod.id));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Zahlungsart konnte nicht gelöscht werden.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL / EINSTELLUNGEN / BUCHHALTUNG</Typography>
        <Typography variant="h1">Zahlungsarten</Typography>
        <Typography color="text.secondary" sx={{ mt: 1 }}>
          Zahlungsarten für die Buchhaltung anlegen und verwalten.
        </Typography>
      </Box>

      {error && <Alert severity="error">{error}</Alert>}
      {!canManage && <Alert severity="warning">Änderungen sind nur für Administratoren möglich.</Alert>}

      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ maxWidth: 680 }}>
        <TextField
          fullWidth
          size="small"
          label="Neue Zahlungsart"
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
        {paymentMethods.map((paymentMethod) => (
          <Stack key={paymentMethod.id} direction="row" alignItems="center" spacing={2} sx={{ minHeight: 46, borderBottom: 1, borderColor: 'divider' }}>
            <Typography sx={{ flexGrow: 1 }}>{paymentMethod.name}</Typography>
            <Button color="error" disabled={!canManage || saving} onClick={() => void remove(paymentMethod)}>Löschen</Button>
          </Stack>
        ))}
        {paymentMethods.length === 0 && <Typography color="text.secondary" sx={{ py: 2 }}>Keine Zahlungsarten vorhanden.</Typography>}
      </Box>
    </Stack>
  );
}
