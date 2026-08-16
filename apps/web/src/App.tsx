import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from '@mui/material';
import { getCurrentUser, type UserProfile } from './api/client';
import { keycloak } from './auth/keycloak';

const AddressOverviewPage = lazy(() => import('./modules/addresses/AddressOverviewPage').then((module) => ({
  default: module.AddressOverviewPage,
})));
const ArticleOverviewPage = lazy(() => import('./modules/articles/ArticleOverviewPage').then((module) => ({
  default: module.ArticleOverviewPage,
})));
const WarehouseLocationsPage = lazy(() => import('./modules/inventory/WarehouseLocationsPage').then((module) => ({
  default: module.WarehouseLocationsPage,
})));
const StockOverviewPage = lazy(() => import('./modules/inventory/StockOverviewPage').then((module) => ({
  default: module.StockOverviewPage,
})));
const SettingsPage = lazy(() => import('./modules/settings/SettingsPage').then((module) => ({
  default: module.SettingsPage,
})));
const SpecificationsPage = lazy(() => import('./modules/settings/SpecificationsPage').then((module) => ({
  default: module.SpecificationsPage,
})));
const ArticleSettingsPage = lazy(() => import('./modules/settings/ArticleSettingsPage').then((module) => ({
  default: module.ArticleSettingsPage,
})));
const PaymentMethodsPage = lazy(() => import('./modules/settings/PaymentMethodsPage').then((module) => ({
  default: module.PaymentMethodsPage,
})));
const InterfacesPage = lazy(() => import('./modules/settings/InterfacesPage').then((module) => ({
  default: module.InterfacesPage,
})));
const ApiConnectionPage = lazy(() => import('./modules/settings/ApiConnectionPage').then((module) => ({
  default: module.ApiConnectionPage,
})));
const InterfaceDataExchangePage = lazy(() => import('./modules/settings/InterfaceDataExchangePage').then((module) => ({
  default: module.InterfaceDataExchangePage,
})));
const CronJobsPage = lazy(() => import('./modules/settings/CronJobsPage').then((module) => ({
  default: module.CronJobsPage,
})));
const BackupPage = lazy(() => import('./modules/settings/BackupUpdatePage').then((module) => ({
  default: module.BackupPage,
})));
const UpdatePage = lazy(() => import('./modules/settings/UpdatePage').then((module) => ({
  default: module.UpdatePage,
})));
const CustomerImportPage = lazy(() => import('./modules/settings/CustomerImportPage').then((module) => ({
  default: module.CustomerImportPage,
})));
const ArticleImportPage = lazy(() => import('./modules/settings/ArticleImportPage').then((module) => ({
  default: module.ArticleImportPage,
})));
const UserManagementPage = lazy(() => import('./modules/settings/UserManagementPage').then((module) => ({
  default: module.UserManagementPage,
})));
const ProductionInstructionsPage = lazy(() => import('./modules/production/ProductionInstructionsPage').then((module) => ({
  default: module.ProductionInstructionsPage,
})));
const ProductionOverviewPage = lazy(() => import('./modules/production/ProductionOverviewPage').then((module) => ({
  default: module.ProductionOverviewPage,
})));

type NavigationItem = {
  label: string;
  route: string;
};

type NavigationGroup = {
  id: string;
  label: string;
  route: string;
  items: NavigationItem[];
};

const settingsItems: NavigationItem[] = [
  { label: 'System', route: '#/settings/system' },
  { label: 'Benutzer', route: '#/settings/users' },
  { label: 'Spezifikationen', route: '#/settings/specifications' },
  { label: 'Artikel', route: '#/settings/articles' },
  { label: 'Zahlungsarten', route: '#/settings/payment-methods' },
  { label: 'Schnittstellen', route: '#/settings/interfaces' },
  { label: 'API-Anbindung', route: '#/settings/api-connection' },
  { label: 'Cronjobs', route: '#/settings/cronjobs' },
  { label: 'Backup', route: '#/settings/backup' },
  { label: 'Update', route: '#/settings/update' },
  { label: 'Rollen & Rechte', route: '#/settings/roles' },
];

const navigation: NavigationGroup[] = [
  {
    id: 'orders',
    label: 'Aufträge',
    route: '#/orders/current',
    items: [
      { label: 'Offene Aufträge', route: '#/orders/current' },
      { label: 'Abgeschlossen', route: '#/orders/completed' },
      { label: 'Archiv', route: '#/orders/archive' },
    ],
  },
  {
    id: 'addresses',
    label: 'Adressen',
    route: '#/',
    items: [
    { label: 'Adressübersicht', route: '#/' },
    { label: 'Kunden', route: '#/addresses/customers' },
    { label: 'Lieferanten', route: '#/addresses/suppliers' },
  ],
},
  {
    id: 'offers',
    label: 'Angebote',
    route: '#/offers/open',
    items: [
      { label: 'Offene Angebote', route: '#/offers/open' },
      { label: 'Angenommen', route: '#/offers/accepted' },
      { label: 'Abgelehnt', route: '#/offers/rejected' },
    ],
  },
  {
    id: 'accounting',
    label: 'Buchhaltung',
    route: '#/accounting/overview',
    items: [
      { label: 'Übersicht', route: '#/accounting/overview' },
      { label: 'Rechnungen', route: '#/accounting/invoices' },
      { label: 'Zahlungen', route: '#/accounting/payments' },
    ],
  },
  {
    id: 'production',
    label: 'Produktion',
    route: '#/production/overview',
    items: [
      { label: 'Produktionsübersicht', route: '#/production/overview' },
      { label: 'Produktionsanweisung', route: '#/production/instructions' },
    ],
  },
  {
    id: 'inventory',
    label: 'Lager',
    route: '#/inventory/items',
    items: [
      { label: 'Artikel', route: '#/inventory/items' },
      { label: 'Lagerplätze', route: '#/inventory/locations' },
      { label: 'Bestände', route: '#/inventory/stock' },
      { label: 'Bewegungen', route: '#/inventory/movements' },
    ],
  },
  {
    id: 'settings',
    label: 'Einstellungen',
    route: '#/settings',
    items: [],
  },
];

function getActiveGroup(route: string) {
  if (route === '#/' || route.startsWith('#/addresses')) return 'addresses';
  if (route.startsWith('#/orders')) return 'orders';
  if (route.startsWith('#/offers')) return 'offers';
  if (route.startsWith('#/accounting')) return 'accounting';
  if (route.startsWith('#/inventory')) return 'inventory';
  if (route.startsWith('#/production')) return 'production';
  if (route.startsWith('#/settings')) return 'settings';
  return 'addresses';
}

function PlaceholderModule({ route }: { route: string }) {
  const item = [...navigation.flatMap((group) => group.items), ...settingsItems].find((entry) => entry.route === route);

  return (
    <Stack spacing={3}>
      <Box>
        <Typography variant="overline" color="primary.main">MODUL</Typography>
        <Typography variant="h1">{item?.label ?? 'Systemstatus'}</Typography>
      </Box>
      <Typography color="text.secondary">
        Dieser Arbeitsbereich ist vorbereitet und wird mit den zugehörigen Funktionen befüllt.
      </Typography>
      <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'max-content 1fr', gap: '8px 24px', m: 0 }}>
        <Typography component="dt" color="text.secondary">STATUS</Typography>
        <Typography component="dd" color="warning.main" sx={{ m: 0 }}>GEPLANT</Typography>
        <Typography component="dt" color="text.secondary">ROUTE</Typography>
        <Typography component="dd" sx={{ m: 0 }}>{route}</Typography>
      </Box>
    </Stack>
  );
}

function NavigationGroupEntry({
  group,
  activeGroupId,
  route,
  navigate,
}: {
  group: NavigationGroup;
  activeGroupId: string;
  route: string;
  navigate: (target: string) => void;
}) {
  const isActive = group.id === activeGroupId;
  const [isInteracting, setIsInteracting] = useState(false);
  const isExpanded = isActive || isInteracting;

  return (
    <Box
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onFocus={() => setIsInteracting(true)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setIsInteracting(false);
      }}
    >
      <Button
        fullWidth
        aria-expanded={isExpanded}
        onClick={() => navigate(group.route)}
        sx={{
          justifyContent: 'flex-start',
          px: 2,
          py: 1,
          borderBottom: 1,
          borderColor: 'divider',
          color: isActive ? 'warning.main' : 'text.primary',
          bgcolor: isActive ? 'action.selected' : 'transparent',
          '&::before': { content: isActive ? '">"' : '" "', width: 18, color: 'primary.main' },
        }}
      >
        {group.label}
      </Button>

      {isExpanded && group.items.length > 0 && (
        <Box sx={{ borderBottom: 1, borderColor: 'divider', py: 0.5 }}>
          {group.items.map((item) => {
            const selected = item.route === route || (item.route === '#/settings/interfaces' && route.startsWith('#/settings/interfaces/'));
            return (
              <Button
                key={item.route}
                fullWidth
                aria-current={selected ? 'page' : undefined}
                onClick={() => navigate(item.route)}
                sx={{
                  justifyContent: 'flex-start',
                  minHeight: 30,
                  px: 4,
                  py: 0.25,
                  color: selected ? 'primary.main' : 'text.secondary',
                  '&::before': { content: selected ? '"└─"' : '"  "', width: 28 },
                }}
              >
                {item.label}
              </Button>
            );
          })}
        </Box>
      )}
    </Box>
  );
}

function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [route, setRoute] = useState(window.location.hash || '#/');

  useEffect(() => {
    getCurrentUser().then(setUser).catch((reason: Error) => setError(reason.message));
  }, []);

  useEffect(() => {
    const handleRoute = () => setRoute(window.location.hash || '#/');
    window.addEventListener('hashchange', handleRoute);
    return () => window.removeEventListener('hashchange', handleRoute);
  }, []);

  const navigate = (target: string) => {
    window.location.hash = target;
  };

  const activeGroupId = getActiveGroup(route);
  const primaryNavigation = navigation.filter((group) => group.id !== 'settings');
  const settingsNavigation = navigation.find((group) => group.id === 'settings')!;

  const roles = keycloak.tokenParsed?.realm_access?.roles ?? [];
  const isAdmin = roles.includes('cms-erp-admin');

  const renderModule = () => {
    const interfaceDataExchangeMatch = route.match(/^#\/settings\/interfaces\/([0-9a-f-]+)\/data-exchange$/i);
    const customerImportMatch = route.match(/^#\/settings\/interfaces\/([0-9a-f-]+)\/customer-import$/i);
    const articleImportMatch = route.match(/^#\/settings\/interfaces\/([0-9a-f-]+)\/article-import$/i);
    if (route === '#/') return <AddressOverviewPage />;
    if (route === '#/inventory/items') return <ArticleOverviewPage />;
    if (route === '#/inventory/locations') return <WarehouseLocationsPage />;
    if (route === '#/inventory/stock') return <StockOverviewPage />;
    if (route === '#/production/overview') return <ProductionOverviewPage />;
    if (route === '#/production/instructions') return <ProductionInstructionsPage />;
    if (route === '#/settings') {
      return (
        <SettingsPage
          items={settingsItems}
          onOpen={navigate}
        />
      );
    }
    if (route === '#/settings/users') {
      return isAdmin
        ? <UserManagementPage currentIdentityId={user?.identityId} />
        : <Alert severity="warning">Die Benutzerverwaltung ist nur für Administratoren verfügbar.</Alert>;
    }
    if (route === '#/settings/specifications') return <SpecificationsPage canManage={isAdmin} />;
    if (route === '#/settings/articles') return <ArticleSettingsPage canManage={isAdmin} />;
    if (route === '#/settings/payment-methods') return <PaymentMethodsPage canManage={isAdmin} />;
    if (route === '#/settings/interfaces') {
      return (
        <InterfacesPage
          canManage={isAdmin}
          onConfigureData={(id) => navigate(`#/settings/interfaces/${id}/data-exchange`)}
          onImportCustomers={(id) => navigate(`#/settings/interfaces/${id}/customer-import`)}
          onImportArticles={(id) => navigate(`#/settings/interfaces/${id}/article-import`)}
        />
      );
    }
    if (interfaceDataExchangeMatch) {
      return (
        <InterfaceDataExchangePage
          integrationId={interfaceDataExchangeMatch[1]}
          canManage={isAdmin}
          onBack={() => navigate('#/settings/interfaces')}
          onOpenCustomerImport={() => navigate(`#/settings/interfaces/${interfaceDataExchangeMatch[1]}/customer-import`)}
          onOpenArticleImport={() => navigate(`#/settings/interfaces/${interfaceDataExchangeMatch[1]}/article-import`)}
        />
      );
    }
    if (customerImportMatch) {
      return (
        <CustomerImportPage
          integrationId={customerImportMatch[1]}
          canManage={isAdmin}
          onBack={() => navigate('#/settings/interfaces')}
          onOpenDataExchange={() => navigate(`#/settings/interfaces/${customerImportMatch[1]}/data-exchange`)}
          onOpenArticleImport={() => navigate(`#/settings/interfaces/${customerImportMatch[1]}/article-import`)}
        />
      );
    }
    if (articleImportMatch) {
      return (
        <ArticleImportPage
          integrationId={articleImportMatch[1]}
          canManage={isAdmin}
          onBack={() => navigate('#/settings/interfaces')}
          onOpenDataExchange={() => navigate(`#/settings/interfaces/${articleImportMatch[1]}/data-exchange`)}
          onOpenCustomerImport={() => navigate(`#/settings/interfaces/${articleImportMatch[1]}/customer-import`)}
        />
      );
    }
    if (route === '#/settings/api-connection') return <ApiConnectionPage />;
    if (route === '#/settings/cronjobs') return <CronJobsPage canManage={isAdmin} />;
    if (route === '#/settings/backup' || route === '#/settings/backup-update') return <BackupPage canManage={isAdmin} />;
    if (route === '#/settings/update') return <UpdatePage canManage={isAdmin} />;
    return <PlaceholderModule route={route} />;
  };

  return (
    <Box
      sx={{
        height: '100dvh',
        p: { xs: 1, md: 1.5 },
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '260px minmax(0, 1fr)' },
        gridTemplateRows: { xs: 'minmax(190px, 36vh) minmax(0, 1fr) 30px', md: 'minmax(0, 1fr) 30px' },
        gridTemplateAreas: { xs: '"menu" "module" "footer"', md: '"menu module" "footer footer"' },
        gap: 1,
      }}
    >
      <Box
        component="nav"
        aria-label="Hauptnavigation"
        sx={{ gridArea: 'menu', border: 1, borderColor: 'divider', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <Box sx={{ minHeight: 0, overflowY: 'auto' }}>
          {primaryNavigation.map((group) => (
            <NavigationGroupEntry key={group.id} group={group} activeGroupId={activeGroupId} route={route} navigate={navigate} />
          ))}
        </Box>

        <Box sx={{ mt: 'auto', flexShrink: 0, borderTop: 1, borderColor: 'divider' }}>
          <NavigationGroupEntry group={settingsNavigation} activeGroupId={activeGroupId} route={route} navigate={navigate} />
          <Button
            fullWidth
            onClick={() => void keycloak.logout({ redirectUri: window.location.origin })}
            sx={{
              justifyContent: 'flex-start',
              px: 2,
              py: 1,
              color: 'error.main',
              '&::before': { content: '" "', width: 18 },
            }}
          >
            Abmelden
          </Button>
        </Box>
      </Box>

      <Box component="main" sx={{ gridArea: 'module', border: 1, borderColor: 'divider', overflow: 'auto', p: { xs: 2, md: 4 } }}>
        <Suspense fallback={<Typography color="text.secondary">Modul wird geladen …</Typography>}>
          {renderModule()}
        </Suspense>
      </Box>

      <Box
        component="footer"
        sx={{
          gridArea: 'footer',
          border: 1,
          borderColor: 'divider',
          minWidth: 0,
          px: 1.25,
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          overflow: 'hidden',
          whiteSpace: 'nowrap',
          fontSize: 11,
        }}
      >
        <Box component="span" sx={{ color: error ? 'error.main' : 'success.main' }}>● {error ? 'DEGRADED' : 'ONLINE'}</Box>
        <Box component="span" sx={{ color: 'text.secondary', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {user?.displayName ?? user?.username ?? 'SITZUNG WIRD GELADEN'} · {isAdmin ? 'ADMIN' : 'BENUTZER'} · CMS_ERP 0.3.3a
        </Box>
      </Box>
    </Box>
  );
}

export default App;
