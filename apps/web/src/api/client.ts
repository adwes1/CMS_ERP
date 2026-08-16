import { keycloak } from '../auth/keycloak';

export type UserProfile = {
  id: string;
  identityId: string;
  username: string;
  email?: string;
  displayName?: string;
};

export type ManagedUser = {
  id: string;
  username: string;
  email: string | null;
  enabled: boolean;
  isAdmin: boolean;
  createdAt: string | null;
};

export type BackupEntry = {
  id: string;
  filename: string;
  createdAt: string;
  sizeBytes: number;
};

export type SystemUpdateStatus = {
  version: {
    status: 'current' | 'update_available' | 'unknown';
    currentVersion: string;
    currentCommit: string;
    latestCommit: string | null;
    latestPublishedAt: string | null;
    repositoryUrl: string;
    latestUrl: string | null;
    branch: string;
    message?: string;
  };
  checks: Array<{
    id: string;
    label: string;
    status: 'ok' | 'warning' | 'error';
    message: string;
    details?: Record<string, string | number>;
  }>;
  systemReady: boolean;
  checkedAt: string;
};

export type CreateUserInput = {
  username: string;
  password: string;
  email?: string;
  isAdmin?: boolean;
};

export type UpdateUserInput = {
  username: string;
  email?: string;
  enabled: boolean;
  isAdmin: boolean;
};

export type Address = {
  id: string;
  addressNumber: number;
  customerNumber?: string | null;
  type: 'KUNDE' | 'LIEFERANT' | 'BEIDES';
  company?: string | null;
  salutation?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  street?: string | null;
  houseNumber?: string | null;
  postalCode?: string | null;
  city?: string | null;
  country: string;
  email?: string | null;
  phone?: string | null;
  mobile?: string | null;
  website?: string | null;
  taxNumber?: string | null;
  notes?: string | null;
  specificationId?: string | null;
  specification?: Specification | null;
  bankData?: Record<string, string> | null;
  deliveryAddresses?: Record<string, string>[] | null;
  contacts?: Record<string, string>[] | null;
  documents?: Record<string, string>[] | null;
  purchasedItems?: Record<string, string>[] | null;
  createdAt: string;
  updatedAt: string;
};

export type CreateAddressInput = Omit<Address, 'id' | 'addressNumber' | 'createdAt' | 'updatedAt' | 'specification'>;

export type PaginatedAddresses = {
  items: Address[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type Specification = {
  id: string;
  name: string;
  createdAt: string;
};

export type PaymentMethod = {
  id: string;
  name: string;
  createdAt: string;
};

export type ArticleType =
  | 'VERKAUFSARTIKEL'
  | 'PRODUKTIONSARTIKEL'
  | 'PRODUKTIONSMATERIAL'
  | 'STUECKLISTENARTIKEL'
  | 'DIGITAL_DOWNLOAD'
  | 'RABATT_GUTSCHEIN'
  | 'VERSANDGEBUEHREN';

export type ArticleTypeSetting = {
  type: ArticleType;
  label: string;
  prefix: string;
  textColor: string;
  nextNumber: number;
  padding: number;
  nextArticleNumber: string;
  createdAt: string;
  updatedAt: string;
};

export type ArticleUnit = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseLocation = {
  id: string;
  location: string;
  shelf: string;
  position: string;
  maxWeight?: string | null;
  length?: string | null;
  width?: string | null;
  depth?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type WarehouseLocationInput = {
  location: string;
  shelf: string;
  position: string;
  maxWeight?: string;
  length?: string;
  width?: string;
  depth?: string;
};

export type ExternalIntegration = {
  id: string;
  name: string;
  provider: 'SHOPWARE_6';
  baseUrl: string;
  clientId: string;
  credentialConfigured: boolean;
  active: boolean;
  lastTestedAt?: string | null;
  lastTestStatus?: 'SUCCESS' | 'FAILED' | null;
  lastTestMessage?: string | null;
  allowImport: boolean;
  allowStockImport: boolean;
  allowExport: boolean;
  allowUpdate: boolean;
  allowDelete: boolean;
  cronEnabled: boolean;
  cronIntervalMinutes: number;
  lastStockSyncAt?: string | null;
  lastStockSyncStatus?: 'RUNNING' | 'SUCCESS' | 'FAILED' | null;
  lastStockSyncMessage?: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ExternalIntegrationInput = {
  name: string;
  provider: 'SHOPWARE_6';
  baseUrl: string;
  clientId: string;
  clientSecret?: string;
  active: boolean;
};

export type Article = {
  id: string;
  articleNumber: string;
  name: string;
  type: ArticleType;
  stock: string;
  stockEntries?: Record<string, string>[] | null;
  unitId: string;
  unit: ArticleUnit;
  vatRate: string;
  netWeightKg?: string | null;
  grossWeightKg?: string | null;
  lengthCm?: string | null;
  widthCm?: string | null;
  heightCm?: string | null;
  notes?: string | null;
  purchasePrices?: Record<string, string>[] | null;
  salePrices?: Record<string, string>[] | null;
  positions?: Record<string, string>[] | null;
  externalNumbers?: Record<string, string>[] | null;
  files?: Record<string, string>[] | null;
  purchasing?: Record<string, string> | null;
  variantLinks?: {
    variantArticleId: string;
    variantType?: string | null;
    variantArticle: Article;
    createdAt: string;
  }[];
  createdAt: string;
  updatedAt: string;
};

export type CreateArticleInput = Omit<Article, 'id' | 'unit' | 'unitId' | 'variantLinks' | 'createdAt' | 'updatedAt'> & {
  unitId?: string;
  variantIds: string[];
  useAutomaticArticleNumber?: boolean;
};

export type ProductionInstructionStepInput = {
  name: string;
  workType: 'PHYSICAL_WORK' | 'PROCESS';
  controlActive: boolean;
  employeeInstruction?: string;
  employeeInstructionActive: boolean;
  confirmationRequired: boolean;
  plannedHours: number;
  plannedMinutes: number;
  timeEstimateActive: boolean;
  timerHours: number;
  timerMinutes: number;
  timerActive: boolean;
  serialNumberMode: 'NONE' | 'GENERATOR' | 'INPUT';
  serialNumberActive: boolean;
};

export type ProductionInstructionElementInput = {
  name: string;
  steps: ProductionInstructionStepInput[];
};

export type ProductionInstructionInput = {
  articleId: string;
  partCount: number;
  elements: ProductionInstructionElementInput[];
};

export type ProductionInstructionStep = ProductionInstructionStepInput & {
  id: string;
  position: number;
};

export type ProductionInstructionElement = Omit<ProductionInstructionElementInput, 'steps'> & {
  id: string;
  position: number;
  steps: ProductionInstructionStep[];
};

export type ProductionInstruction = {
  id: string;
  instructionNumber: number;
  articleId: string;
  article: Pick<Article, 'id' | 'articleNumber' | 'name' | 'type'>;
  name: string;
  partCount: number;
  elements: ProductionInstructionElement[];
  createdAt: string;
  updatedAt: string;
};

export type ProductionStep = ProductionInstructionStepInput & {
  id: string;
  position: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'PROBLEM';
  startedAt?: string | null;
  completedAt?: string | null;
};

export type ProductionElement = {
  id: string;
  position: number;
  name: string;
  steps: ProductionStep[];
};

export type Production = {
  id: string;
  productionNumber: number;
  productionInstructionId: string;
  productionInstruction: Pick<ProductionInstruction, 'id' | 'instructionNumber' | 'name' | 'updatedAt'>;
  instructionNumber: number;
  articleId: string;
  article: Pick<Article, 'id' | 'articleNumber' | 'name'>;
  name: string;
  startDate: string;
  completionDate: string;
  plannedDays: number;
  status: 'PLANNED' | 'IN_PROGRESS' | 'PAUSED' | 'COMPLETED' | 'PROBLEM';
  elements: ProductionElement[];
  createdAt: string;
  updatedAt: string;
};

export type ProductionSummary = Omit<Production, 'elements'> & {
  elements: Array<Pick<ProductionElement, 'id' | 'position' | 'name'> & {
    steps: Array<Pick<ProductionStep, 'id' | 'position' | 'name' | 'status'>>;
  }>;
};

export type ProductionInstructionSummary = Omit<ProductionInstruction, 'elements'> & {
  elementCount: number;
  stepCount: number;
};

async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  await keycloak.updateToken(30);
  const token = keycloak.token;
  if (!token) throw new Error('Die Sitzung ist abgelaufen. Bitte melde dich erneut an.');

  const response = await fetch(path, {
    ...init,
    credentials: 'same-origin',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string | string[] } | null;
    const message = Array.isArray(error?.message) ? error.message.join(', ') : error?.message;
    throw new Error(message || `Anfrage fehlgeschlagen (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  const body = await response.text();
  if (!body.trim()) return undefined as T;
  try {
    return JSON.parse(body) as T;
  } catch {
    throw new Error('Der Server hat eine ungültige Antwort geliefert.');
  }
}

export async function getCurrentUser(): Promise<UserProfile> {
  return apiRequest<UserProfile>('/api/users/me');
}

export const getSystemUpdateStatus = () =>
  apiRequest<SystemUpdateStatus>('/api/system-update/status');

export const listBackups = () => apiRequest<BackupEntry[]>('/api/backups');

export const createBackup = () =>
  apiRequest<BackupEntry>('/api/backups', { method: 'POST' });

export const restoreBackup = (id: string) =>
  apiRequest<{ restored: boolean; restoredAt: string }>(`/api/backups/${encodeURIComponent(id)}/restore`, { method: 'POST' });

export const deleteBackup = (id: string) =>
  apiRequest<void>(`/api/backups/${encodeURIComponent(id)}`, { method: 'DELETE' });

export async function downloadBackup(backup: BackupEntry) {
  await keycloak.updateToken(30);
  if (!keycloak.token) throw new Error('Die Sitzung ist abgelaufen. Bitte melde dich erneut an.');
  const response = await fetch(`/api/backups/${encodeURIComponent(backup.id)}/download`, {
    credentials: 'same-origin',
    headers: { Authorization: `Bearer ${keycloak.token}` },
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { message?: string } | null;
    throw new Error(error?.message || `Download fehlgeschlagen (${response.status})`);
  }
  const url = URL.createObjectURL(await response.blob());
  const link = document.createElement('a');
  link.href = url;
  link.download = backup.filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const listUsers = () => apiRequest<ManagedUser[]>('/api/users');

export const createUser = (input: CreateUserInput) =>
  apiRequest<{ created: boolean }>('/api/users', { method: 'POST', body: JSON.stringify(input) });

export const updateUser = (id: string, input: UpdateUserInput) =>
  apiRequest<{ updated: boolean }>(`/api/users/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const resetUserPassword = (id: string, password: string) =>
  apiRequest<void>(`/api/users/${encodeURIComponent(id)}/password`, {
    method: 'PUT',
    body: JSON.stringify({ password }),
  });

export const listAddresses = (options: { page: number; pageSize: number; search?: string }) => {
  const query = new URLSearchParams({
    page: String(options.page),
    pageSize: String(options.pageSize),
  });
  if (options.search?.trim()) query.set('search', options.search.trim());
  return apiRequest<PaginatedAddresses>(`/api/addresses?${query.toString()}`);
};

export const createAddress = (input: CreateAddressInput) =>
  apiRequest<Address>('/api/addresses', { method: 'POST', body: JSON.stringify(input) });

export const updateAddress = (id: string, input: CreateAddressInput) =>
  apiRequest<Address>(`/api/addresses/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) });

export const listSpecifications = () => apiRequest<Specification[]>('/api/specifications');

export const createSpecification = (name: string) =>
  apiRequest<Specification>('/api/specifications', { method: 'POST', body: JSON.stringify({ name }) });

export const updateSpecification = (id: string, name: string) =>
  apiRequest<Specification>(`/api/specifications/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify({ name }),
  });

export const deleteSpecification = (id: string) =>
  apiRequest<void>(`/api/specifications/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const listPaymentMethods = () => apiRequest<PaymentMethod[]>('/api/payment-methods');

export const createPaymentMethod = (name: string) =>
  apiRequest<PaymentMethod>('/api/payment-methods', { method: 'POST', body: JSON.stringify({ name }) });

export const deletePaymentMethod = (id: string) =>
  apiRequest<void>(`/api/payment-methods/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const listArticles = () => apiRequest<Article[]>('/api/articles');

export const getArticle = (id: string) =>
  apiRequest<Article>(`/api/articles/${encodeURIComponent(id)}`);

export const createArticle = (input: CreateArticleInput) =>
  apiRequest<Article>('/api/articles', { method: 'POST', body: JSON.stringify(input) });

export const updateArticle = (id: string, input: CreateArticleInput) =>
  apiRequest<Article>(`/api/articles/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(input) });

export const listProductionInstructions = () =>
  apiRequest<ProductionInstructionSummary[]>('/api/production-instructions');

export const getProductionInstruction = (id: string) =>
  apiRequest<ProductionInstruction>(`/api/production-instructions/${encodeURIComponent(id)}`);

export const createProductionInstruction = (input: ProductionInstructionInput) =>
  apiRequest<ProductionInstruction>('/api/production-instructions', { method: 'POST', body: JSON.stringify(input) });

export const updateProductionInstruction = (id: string, input: ProductionInstructionInput) =>
  apiRequest<ProductionInstruction>(`/api/production-instructions/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteProductionInstruction = (id: string) =>
  apiRequest<void>(`/api/production-instructions/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const listProductions = () => apiRequest<ProductionSummary[]>('/api/productions');

export const createProduction = (input: { productionInstructionId: string; startDate: string; completionDate: string }) =>
  apiRequest<Production>('/api/productions', {
    method: 'POST',
    body: JSON.stringify(input),
  });

export const uploadArticleImage = (name: string, dataUrl: string) =>
  apiRequest<{ reference: string; mimeType: string }>('/api/article-images', {
    method: 'POST',
    body: JSON.stringify({ name, dataUrl }),
  });

export const listArticleUnits = () => apiRequest<ArticleUnit[]>('/api/article-units');

export const listArticleTypeSettings = () => apiRequest<ArticleTypeSetting[]>('/api/article-type-settings');

export const updateArticleTypeSetting = (type: ArticleType, input: Pick<ArticleTypeSetting, 'label' | 'prefix' | 'textColor' | 'nextNumber'>) =>
  apiRequest<ArticleTypeSetting>(`/api/article-type-settings/${encodeURIComponent(type)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const createArticleUnit = (name: string) =>
  apiRequest<ArticleUnit>('/api/article-units', { method: 'POST', body: JSON.stringify({ name }) });

export const updateArticleUnit = (id: string, name: string) =>
  apiRequest<ArticleUnit>(`/api/article-units/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify({ name }) });

export const deleteArticleUnit = (id: string) =>
  apiRequest<void>(`/api/article-units/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const listWarehouseLocations = () => apiRequest<WarehouseLocation[]>('/api/warehouse-locations');

export const createWarehouseLocation = (input: WarehouseLocationInput) =>
  apiRequest<WarehouseLocation>('/api/warehouse-locations', { method: 'POST', body: JSON.stringify(input) });

export const updateWarehouseLocation = (id: string, input: WarehouseLocationInput) =>
  apiRequest<WarehouseLocation>(`/api/warehouse-locations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteWarehouseLocation = (id: string) =>
  apiRequest<void>(`/api/warehouse-locations/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const listExternalIntegrations = () =>
  apiRequest<ExternalIntegration[]>('/api/external-integrations');

export const getExternalIntegration = (id: string) =>
  apiRequest<ExternalIntegration>(`/api/external-integrations/${encodeURIComponent(id)}`);

export const createExternalIntegration = (input: ExternalIntegrationInput & { clientSecret: string }) =>
  apiRequest<ExternalIntegration>('/api/external-integrations', { method: 'POST', body: JSON.stringify(input) });

export const updateExternalIntegration = (id: string, input: Partial<ExternalIntegrationInput>) =>
  apiRequest<ExternalIntegration>(`/api/external-integrations/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const deleteExternalIntegration = (id: string) =>
  apiRequest<void>(`/api/external-integrations/${encodeURIComponent(id)}`, { method: 'DELETE' });

export const testExternalIntegration = (id: string) =>
  apiRequest<{ success: boolean; message: string }>(`/api/external-integrations/${encodeURIComponent(id)}/test`, { method: 'POST' });

export type IntegrationDataPermissions = Pick<ExternalIntegration, 'allowImport' | 'allowStockImport' | 'allowExport' | 'allowUpdate' | 'allowDelete'>;

export const updateIntegrationDataPermissions = (id: string, input: IntegrationDataPermissions) =>
  apiRequest<ExternalIntegration>(`/api/external-integrations/${encodeURIComponent(id)}/data-permissions`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export const updateIntegrationCronSettings = (id: string, input: { intervalMinutes: number; enabled: boolean }) =>
  apiRequest<ExternalIntegration>(`/api/external-integrations/${encodeURIComponent(id)}/cron-settings`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });

export type CustomerImportPreviewItem = {
  externalId: string;
  customerNumber: string;
  company: string;
  firstName: string;
  lastName: string;
  email: string;
  street: string;
  postalCode: string;
  city: string;
  country: string;
  separateDeliveryAddress: boolean;
  status: 'READY' | 'ALREADY_IMPORTED' | 'DUPLICATE';
};

export type CustomerImportPreview = {
  total: number;
  limit: number;
  customers: CustomerImportPreviewItem[];
  writesPerformed: false;
};

export type CustomerImportJob = {
  id: string;
  integrationId: string;
  status: 'RUNNING' | 'PROCESSING' | 'COMPLETED';
  page: number;
  batchSize: number;
  total: number;
  processed: number;
  imported: number;
  skipped: number;
  failed: number;
  errorMessage?: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt?: string | null;
};

export const previewCustomerImport = (integrationId: string) =>
  apiRequest<CustomerImportPreview>(`/api/external-integrations/${encodeURIComponent(integrationId)}/customer-import/preview`, { method: 'POST' });

export const getLatestCustomerImport = async (integrationId: string) => {
  const result = await apiRequest<{ job: CustomerImportJob | null }>(`/api/external-integrations/${encodeURIComponent(integrationId)}/customer-import/latest`);
  return result.job;
};

export const startCustomerImport = (integrationId: string) =>
  apiRequest<CustomerImportJob>(`/api/external-integrations/${encodeURIComponent(integrationId)}/customer-import/start`, {
    method: 'POST',
    body: JSON.stringify({ previewConfirmed: true }),
  });

export const processNextCustomerImportBatch = (integrationId: string, jobId: string) =>
  apiRequest<CustomerImportJob>(`/api/external-integrations/${encodeURIComponent(integrationId)}/customer-import/${encodeURIComponent(jobId)}/next`, { method: 'POST' });

export type ArticleImportPreviewItem = {
  externalId: string;
  articleNumber: string;
  name: string;
  stock: string;
  unit: string;
  vatRate: string;
  purchasePrice: string;
  salePrice: string;
  hasProductImage: boolean;
  isVariant: boolean;
  variantType: string;
  status: 'READY' | 'ALREADY_IMPORTED' | 'DUPLICATE' | 'INVALID';
};

export type ArticleImportPreview = {
  total: number;
  limit: number;
  articles: ArticleImportPreviewItem[];
  writesPerformed: false;
};

export type ArticleImportJob = Omit<CustomerImportJob, 'integrationId'> & { integrationId: string };

export const previewArticleImport = (integrationId: string) =>
  apiRequest<ArticleImportPreview>(`/api/external-integrations/${encodeURIComponent(integrationId)}/article-import/preview`, { method: 'POST' });

export const getLatestArticleImport = async (integrationId: string) => {
  const result = await apiRequest<{ job: ArticleImportJob | null }>(`/api/external-integrations/${encodeURIComponent(integrationId)}/article-import/latest`);
  return result.job;
};

export const startArticleImport = (integrationId: string) =>
  apiRequest<ArticleImportJob>(`/api/external-integrations/${encodeURIComponent(integrationId)}/article-import/start`, {
    method: 'POST',
    body: JSON.stringify({ previewConfirmed: true }),
  });

export const processNextArticleImportBatch = (integrationId: string, jobId: string) =>
  apiRequest<ArticleImportJob>(`/api/external-integrations/${encodeURIComponent(integrationId)}/article-import/${encodeURIComponent(jobId)}/next`, { method: 'POST' });
