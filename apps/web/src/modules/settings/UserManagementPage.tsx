import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import {
  createUser,
  listUsers,
  resetUserPassword,
  updateUser,
  type ManagedUser,
} from '../../api/client';

type Props = { currentIdentityId?: string };
type UserForm = { username: string; password: string; email: string; enabled: boolean; isAdmin: boolean };
const emptyForm: UserForm = { username: '', password: '', email: '', enabled: true, isAdmin: false };

export function UserManagementPage({ currentIdentityId }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [editing, setEditing] = useState<ManagedUser | null | undefined>(undefined);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [passwordUser, setPasswordUser] = useState<ManagedUser | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listUsers();
      setUsers(result.sort((a, b) => a.username.localeCompare(b.username, 'de')));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Benutzer konnten nicht geladen werden');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setError(null);
  };

  const openEdit = (user: ManagedUser) => {
    setEditing(user);
    setForm({ username: user.username, password: '', email: user.email ?? '', enabled: user.enabled, isAdmin: user.isAdmin });
    setError(null);
  };

  const closeEditor = () => !saving && setEditing(undefined);

  const save = async () => {
    if (!form.username.trim() || (editing === null && form.password.length < 12)) return;
    setSaving(true);
    setError(null);
    try {
      if (editing) {
        await updateUser(editing.id, {
          username: form.username,
          email: form.email || undefined,
          enabled: form.enabled,
          isAdmin: form.isAdmin,
        });
        setNotice(`Benutzer „${form.username}“ wurde aktualisiert.`);
      } else {
        await createUser({ username: form.username, password: form.password, email: form.email || undefined, isAdmin: form.isAdmin });
        setNotice(`Benutzer „${form.username}“ wurde angelegt.`);
      }
      setEditing(undefined);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Benutzer konnte nicht gespeichert werden');
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async () => {
    if (!passwordUser || newPassword.length < 12) return;
    setSaving(true);
    setError(null);
    try {
      await resetUserPassword(passwordUser.id, newPassword);
      setNotice(`Passwort für „${passwordUser.username}“ wurde geändert.`);
      setPasswordUser(null);
      setNewPassword('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Passwort konnte nicht geändert werden');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack spacing={4}>
      <Box>
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" gap={2}>
          <Box>
            <Typography variant="overline" color="primary.main">MODUL / ADMINISTRATION</Typography>
            <Typography variant="h1">Benutzerverwaltung</Typography>
            <Typography color="text.secondary" sx={{ mt: 1 }}>Anmeldekonten und Berechtigungen zentral verwalten.</Typography>
          </Box>
          <Stack direction="row" spacing={1} alignItems="flex-start">
            <Button variant="outlined" onClick={() => void load()}>Neu laden</Button>
            <Button variant="contained" onClick={openCreate}>Benutzer anlegen</Button>
          </Stack>
        </Stack>
      </Box>

      {error && <Alert severity="error" onClose={() => setError(null)}>{error}</Alert>}
      {notice && <Alert severity="success" onClose={() => setNotice(null)}>{notice}</Alert>}

      <Box sx={{ borderTop: 1, borderColor: 'divider' }}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h2">Benutzer</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{users.length} {users.length === 1 ? 'Anmeldekonto' : 'Anmeldekonten'}</Typography>
        </Box>
        <Divider />
        {loading ? (
          <Stack direction="row" spacing={2} alignItems="center" sx={{ p: 3 }}><CircularProgress size={20} /><Typography>Lade Benutzer …</Typography></Stack>
        ) : users.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 3 }}>Noch keine Benutzer vorhanden.</Typography>
        ) : users.map((user, index) => (
          <Box key={user.id}>
            {index > 0 && <Divider />}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ sm: 'center' }} sx={{ p: 2.5 }}>
              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                  <Typography sx={{ fontWeight: 600 }}>{user.username}</Typography>
                  {user.id === currentIdentityId && <Chip label="DU" size="small" color="primary" variant="outlined" />}
                  {user.isAdmin && <Chip label="ADMIN" size="small" color="secondary" variant="outlined" />}
                  <Chip label={user.enabled ? 'AKTIV' : 'DEAKTIVIERT'} size="small" color={user.enabled ? 'success' : 'default'} variant="outlined" />
                </Stack>
                <Typography variant="body2" color="text.secondary" noWrap>{user.email || 'Keine E-Mail hinterlegt'}</Typography>
              </Box>
              <Stack direction="row" spacing={0.5}>
                <Button aria-label={`Passwort für ${user.username} ändern`} onClick={() => { setPasswordUser(user); setNewPassword(''); }}>Passwort</Button>
                <Button aria-label={`${user.username} bearbeiten`} onClick={() => openEdit(user)}>Bearbeiten</Button>
              </Stack>
            </Stack>
          </Box>
        ))}
      </Box>

      <Dialog open={editing !== undefined} onClose={closeEditor} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? 'Benutzer bearbeiten' : 'Benutzer anlegen'}</DialogTitle>
        <DialogContent>
          <Stack spacing={1.5} sx={{ pt: 1 }}>
            <TextField label="Benutzername" required autoFocus value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} />
            {!editing && (
              <TextField
                label="Passwort"
                type="password"
                required
                value={form.password}
                helperText="Mindestens 12 Zeichen"
                slotProps={{ htmlInput: { minLength: 12, maxLength: 128 } }}
                onChange={(event) => setForm({ ...form, password: event.target.value })}
              />
            )}
            <TextField label="E-Mail (optional)" type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} />
            <FormControlLabel control={<Checkbox checked={form.isAdmin} onChange={(event) => setForm({ ...form, isAdmin: event.target.checked })} />} label="Administratorrechte" />
            {editing && <FormControlLabel control={<Switch checked={form.enabled} onChange={(event) => setForm({ ...form, enabled: event.target.checked })} />} label="Benutzer ist aktiv" />}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={closeEditor} disabled={saving}>Abbrechen</Button>
          <Button variant="contained" onClick={() => void save()} disabled={saving || !form.username.trim() || (!editing && form.password.length < 12)}>{saving ? 'Speichert …' : 'Speichern'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(passwordUser)} onClose={() => !saving && setPasswordUser(null)} fullWidth maxWidth="xs">
        <DialogTitle>Passwort ändern</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Neues Passwort für „{passwordUser?.username}“.</Typography>
          <TextField
            label="Neues Passwort"
            type="password"
            required
            autoFocus
            fullWidth
            value={newPassword}
            helperText="Mindestens 12 Zeichen"
            slotProps={{ htmlInput: { minLength: 12, maxLength: 128 } }}
            onChange={(event) => setNewPassword(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPasswordUser(null)} disabled={saving}>Abbrechen</Button>
          <Button variant="contained" onClick={() => void savePassword()} disabled={saving || newPassword.length < 12}>{saving ? 'Speichert …' : 'Passwort speichern'}</Button>
        </DialogActions>
      </Dialog>
    </Stack>
  );
}
