import { BadGatewayException, BadRequestException, ConflictException, Injectable, NotFoundException, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateExternalIntegrationDto, UpdateExternalIntegrationDto } from './dto/external-integration.dto';

const publicSelection = {
  id: true,
  name: true,
  provider: true,
  baseUrl: true,
  clientId: true,
  active: true,
  lastTestedAt: true,
  lastTestStatus: true,
  lastTestMessage: true,
  allowImport: true,
  allowStockImport: true,
  allowExport: true,
  allowUpdate: true,
  allowDelete: true,
  cronEnabled: true,
  cronIntervalMinutes: true,
  lastStockSyncAt: true,
  lastStockSyncStatus: true,
  lastStockSyncMessage: true,
  createdAt: true,
  updatedAt: true,
} as const;

type ShopwareCustomerAddress = {
  id?: string | null;
  countryId?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  street?: string | null;
  zipcode?: string | null;
  city?: string | null;
  phoneNumber?: string | null;
  additionalAddressLine1?: string | null;
  additionalAddressLine2?: string | null;
  country?: { name?: string | null; translated?: { name?: string | null } | null } | null;
  salutation?: { displayName?: string | null; translated?: { displayName?: string | null } | null } | null;
};

type ShopwareCustomer = {
  id: string;
  customerNumber?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  company?: string | null;
  email?: string | null;
  vatIds?: string[] | null;
  customerComment?: string | null;
  defaultBillingAddress?: ShopwareCustomerAddress | null;
  defaultShippingAddress?: ShopwareCustomerAddress | null;
  salutation?: { displayName?: string | null; translated?: { displayName?: string | null } | null } | null;
};

type CustomerImportPreviewItem = {
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

type ShopwarePrice = { net?: number | string | null; gross?: number | string | null };
type ShopwareMedia = {
  url?: string | null;
  fileName?: string | null;
  fileExtension?: string | null;
  mimeType?: string | null;
};
type ShopwarePropertyOption = {
  name?: string | null;
  translated?: { name?: string | null } | null;
  group?: {
    name?: string | null;
    translated?: { name?: string | null } | null;
  } | null;
};
type ShopwareProduct = {
  id: string;
  parentId?: string | null;
  productNumber?: string | null;
  name?: string | null;
  translated?: { name?: string | null; description?: string | null } | null;
  description?: string | null;
  stock?: number | string | null;
  weight?: number | string | null;
  width?: number | string | null;
  height?: number | string | null;
  length?: number | string | null;
  ean?: string | null;
  price?: ShopwarePrice[] | null;
  purchasePrices?: ShopwarePrice[] | null;
  tax?: { taxRate?: number | string | null } | null;
  unit?: {
    name?: string | null;
    shortCode?: string | null;
    translated?: { name?: string | null; shortCode?: string | null } | null;
  } | null;
  cover?: { media?: ShopwareMedia | null } | null;
  parent?: {
    productNumber?: string | null;
    name?: string | null;
    translated?: { name?: string | null } | null;
  } | null;
  options?: ShopwarePropertyOption[] | null;
};

type ArticleImportPreviewItem = {
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

@Injectable()
export class ExternalIntegrationsService implements OnModuleInit, OnModuleDestroy {
  private readonly encryptionKey: Buffer;
  private stockCronTimer?: ReturnType<typeof setInterval>;
  private stockCronChecking = false;

  constructor(private readonly prisma: PrismaService) {
    const secret = process.env.INTEGRATION_ENCRYPTION_KEY;
    if (!secret) throw new Error('INTEGRATION_ENCRYPTION_KEY ist nicht konfiguriert');
    this.encryptionKey = createHash('sha256').update(secret).digest();
  }

  onModuleInit() {
    this.stockCronTimer = setInterval(() => void this.runDueStockImports(), 30000);
    this.stockCronTimer.unref();
    setTimeout(() => void this.runDueStockImports(), 1000).unref();
  }

  onModuleDestroy() {
    if (this.stockCronTimer) clearInterval(this.stockCronTimer);
  }

  private encrypt(value: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.encryptionKey, iv);
    const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
    return [iv, cipher.getAuthTag(), encrypted].map((part) => part.toString('base64url')).join('.');
  }

  private decrypt(value: string) {
    const [ivValue, tagValue, encryptedValue] = value.split('.');
    const decipher = createDecipheriv('aes-256-gcm', this.encryptionKey, Buffer.from(ivValue, 'base64url'));
    decipher.setAuthTag(Buffer.from(tagValue, 'base64url'));
    return Buffer.concat([
      decipher.update(Buffer.from(encryptedValue, 'base64url')),
      decipher.final(),
    ]).toString('utf8');
  }

  private async normalizeBaseUrl(value: string) {
    const url = new URL(value.trim());
    if (url.protocol !== 'https:') {
      throw new BadRequestException('Schnittstellen müssen HTTPS verwenden');
    }
    if (url.username || url.password) {
      throw new BadRequestException('Zugangsdaten dürfen nicht Bestandteil der URL sein');
    }
    if (url.pathname !== '/' || url.search || url.hash) {
      throw new BadRequestException('Bitte nur die Basis-URL ohne Pfad, Parameter oder Fragment angeben');
    }

    await this.assertPublicHost(url.hostname);
    return url.origin;
  }

  private async assertPublicHost(hostname: string) {
    let addresses: string[];
    try {
      addresses = isIP(hostname)
        ? [hostname]
        : (await lookup(hostname, { all: true, verbatim: true })).map(({ address }) => address);
    } catch {
      throw new BadRequestException('Der Hostname der Schnittstelle konnte nicht aufgelöst werden');
    }
    if (!addresses.length || addresses.some((address) => this.isPrivateAddress(address))) {
      throw new BadRequestException('Interne oder reservierte Netzwerkadressen sind nicht zulässig');
    }
  }

  private isPrivateAddress(address: string): boolean {
    if (address.includes(':')) {
      const normalized = address.toLowerCase();
      const mappedIpv4 = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
      if (mappedIpv4) return this.isPrivateAddress(mappedIpv4);
      return normalized === '::' || normalized === '::1'
        || normalized.startsWith('fc') || normalized.startsWith('fd')
        || /^fe[89ab]/.test(normalized) || normalized.startsWith('ff')
        || normalized === '2001:db8::' || normalized.startsWith('2001:db8:');
    }

    const [first, second, third] = address.split('.').map(Number);
    return first === 0 || first === 10 || first === 127 || first >= 224
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && (second === 0 || second === 168))
      || (first === 198 && (second === 18 || second === 19))
      || (first === 198 && second === 51 && third === 100)
      || (first === 203 && second === 0 && third === 113);
  }

  private async readBytes(response: Response, maxBytes: number): Promise<Buffer> {
    const announcedSize = Number(response.headers.get('content-length'));
    if (Number.isFinite(announcedSize) && announcedSize > maxBytes) {
      await response.body?.cancel();
      throw new BadGatewayException('Die Antwort der Schnittstelle ist zu groß');
    }
    if (!response.body) throw new BadGatewayException('Die Schnittstelle hat keine Antwort geliefert');

    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let receivedBytes = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        receivedBytes += value.byteLength;
        if (receivedBytes > maxBytes) {
          await reader.cancel();
          throw new BadGatewayException('Die Antwort der Schnittstelle ist zu groß');
        }
        chunks.push(value);
      }
      return Buffer.concat(chunks);
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Die Antwort der Schnittstelle konnte nicht gelesen werden');
    } finally {
      reader.releaseLock();
    }
  }

  private async readJson<T>(response: Response, maxBytes: number): Promise<T> {
    try {
      return JSON.parse((await this.readBytes(response, maxBytes)).toString('utf8')) as T;
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      throw new BadGatewayException('Die Schnittstelle hat ungültiges JSON geliefert');
    }
  }

  private async getShopwareAccess(integration: {
    baseUrl: string;
    clientId: string;
    clientSecretEncrypted: string;
  }) {
    const baseUrl = await this.normalizeBaseUrl(integration.baseUrl);
    const response = await fetch(`${baseUrl}/api/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        grant_type: 'client_credentials',
        client_id: integration.clientId,
        client_secret: this.decrypt(integration.clientSecretEncrypted),
      }),
      signal: AbortSignal.timeout(10000),
      redirect: 'error',
    });
    if (!response.ok) throw new BadGatewayException(`Shopware hat die Anmeldung abgelehnt (HTTP ${response.status})`);
    const body = await this.readJson<{ access_token?: unknown }>(response, 64 * 1024);
    if (typeof body.access_token !== 'string' || !body.access_token) {
      throw new BadGatewayException('Shopware hat kein gültiges Zugriffstoken zurückgegeben');
    }
    return { baseUrl, accessToken: body.access_token };
  }

  private async fetchShopwareCustomers(
    integration: { baseUrl: string; clientId: string; clientSecretEncrypted: string },
    page: number,
    limit: number,
  ) {
    const { baseUrl, accessToken } = await this.getShopwareAccess(integration);
    const response = await fetch(`${baseUrl}/api/search/customer`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        page,
        limit,
        'total-count-mode': 1,
        sort: [{ field: 'createdAt', order: 'ASC' }, { field: 'id', order: 'ASC' }],
        associations: {
          salutation: {},
          defaultBillingAddress: { associations: { country: {}, salutation: {} } },
          defaultShippingAddress: { associations: { country: {}, salutation: {} } },
        },
      }),
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
    if (!response.ok) throw new BadGatewayException(`Shopware-Kunden konnten nicht gelesen werden (HTTP ${response.status})`);
    const body = await this.readJson<{ data?: unknown; total?: unknown }>(response, 8 * 1024 * 1024);
    if (!Array.isArray(body.data)) throw new BadGatewayException('Shopware hat ein ungültiges Kundenformat zurückgegeben');
    return {
      data: body.data as ShopwareCustomer[],
      total: typeof body.total === 'number' ? body.total : body.data.length,
    };
  }

  private async fetchShopwareProducts(
    integration: { baseUrl: string; clientId: string; clientSecretEncrypted: string },
    page: number,
    limit: number,
  ) {
    const { baseUrl, accessToken } = await this.getShopwareAccess(integration);
    const response = await fetch(`${baseUrl}/api/search/product`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        page,
        limit,
        'total-count-mode': 1,
        sort: [{ field: 'createdAt', order: 'ASC' }, { field: 'id', order: 'ASC' }],
        associations: {
          tax: {},
          unit: {},
          cover: { associations: { media: {} } },
          options: { associations: { group: {} } },
        },
      }),
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
    if (!response.ok) throw new BadGatewayException(`Shopware-Artikel konnten nicht gelesen werden (HTTP ${response.status})`);
    const body = await this.readJson<{ data?: unknown; total?: unknown }>(response, 8 * 1024 * 1024);
    if (!Array.isArray(body.data)) throw new BadGatewayException('Shopware hat ein ungültiges Artikelformat zurückgegeben');
    const products = body.data as ShopwareProduct[];
    const parentIds = [...new Set(products.map((product) => product.parentId).filter((id): id is string => Boolean(id)))];
    const parentsById = new Map<string, ShopwareProduct>();
    if (parentIds.length) {
      const parentResponse = await fetch(`${baseUrl}/api/search/product`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          limit: parentIds.length,
          filter: [{ type: 'equalsAny', field: 'id', value: parentIds }],
        }),
        signal: AbortSignal.timeout(20000),
        redirect: 'error',
      });
      if (!parentResponse.ok) {
        throw new BadGatewayException(`Shopware-Elternartikel konnten nicht gelesen werden (HTTP ${parentResponse.status})`);
      }
      const parentBody = await this.readJson<{ data?: unknown }>(parentResponse, 8 * 1024 * 1024);
      if (!Array.isArray(parentBody.data)) {
        throw new BadGatewayException('Shopware hat ein ungültiges Elternartikelformat zurückgegeben');
      }
      for (const parent of parentBody.data as ShopwareProduct[]) parentsById.set(parent.id, parent);
    }
    return {
      data: products.map((product) => ({
        ...product,
        parent: product.parentId ? parentsById.get(product.parentId) ?? null : null,
      })),
      total: typeof body.total === 'number' ? body.total : body.data.length,
    };
  }

  private async fetchShopwareStockPage(
    integration: { baseUrl: string; clientId: string; clientSecretEncrypted: string },
    page: number,
    limit: number,
  ) {
    const { baseUrl, accessToken } = await this.getShopwareAccess(integration);
    const response = await fetch(`${baseUrl}/api/search/product`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        page,
        limit,
        'total-count-mode': 1,
        sort: [{ field: 'id', order: 'ASC' }],
        includes: { product: ['id', 'stock'] },
      }),
      signal: AbortSignal.timeout(20000),
      redirect: 'error',
    });
    if (!response.ok) throw new BadGatewayException(`Shopware-Lagerbestände konnten nicht gelesen werden (HTTP ${response.status})`);
    const body = await this.readJson<{ data?: unknown; total?: unknown }>(response, 8 * 1024 * 1024);
    if (!Array.isArray(body.data)) throw new BadGatewayException('Shopware hat ein ungültiges Lagerbestandsformat zurückgegeben');
    return {
      data: body.data as Array<{ id: string; stock?: number | string | null }>,
      total: typeof body.total === 'number' ? body.total : body.data.length,
    };
  }

  private text(value: unknown, maxLength: number) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
  }

  private mapShopwareCustomer(customer: ShopwareCustomer): Omit<CustomerImportPreviewItem, 'status'> {
    const billing = customer.defaultBillingAddress;
    const country = billing?.country?.translated?.name || billing?.country?.name || 'Deutschland';
    return {
      externalId: this.text(customer.id, 64),
      customerNumber: this.text(customer.customerNumber, 64),
      company: this.text(customer.company || billing?.company, 200),
      firstName: this.text(customer.firstName || billing?.firstName, 100),
      lastName: this.text(customer.lastName || billing?.lastName, 100),
      email: this.text(customer.email, 254),
      street: this.text(billing?.street, 200),
      postalCode: this.text(billing?.zipcode, 20),
      city: this.text(billing?.city, 100),
      country: this.text(country, 100) || 'Deutschland',
      separateDeliveryAddress: this.hasSeparateDeliveryAddress(
        customer.defaultBillingAddress,
        customer.defaultShippingAddress,
      ),
    };
  }

  private normalizedAddressValue(value: unknown) {
    return this.text(value, 500).toLocaleLowerCase('de').replace(/\s+/g, ' ');
  }

  private hasSeparateDeliveryAddress(
    billing?: ShopwareCustomerAddress | null,
    shipping?: ShopwareCustomerAddress | null,
  ) {
    if (!shipping) return false;
    if (billing?.id && shipping.id && billing.id === shipping.id) return false;
    if (!billing) return true;
    const fields: Array<keyof ShopwareCustomerAddress> = [
      'firstName',
      'lastName',
      'company',
      'street',
      'zipcode',
      'city',
      'additionalAddressLine1',
      'additionalAddressLine2',
    ];
    const sameCoreFields = fields.every((field) =>
      this.normalizedAddressValue(billing[field]) === this.normalizedAddressValue(shipping[field]),
    );
    const billingCountry = billing.countryId || billing.country?.translated?.name || billing.country?.name;
    const shippingCountry = shipping.countryId || shipping.country?.translated?.name || shipping.country?.name;
    return !(sameCoreFields
      && this.normalizedAddressValue(billingCountry) === this.normalizedAddressValue(shippingCountry));
  }

  private mapShopwareDeliveryAddress(address: ShopwareCustomerAddress): Record<string, string> {
    const country = address.country?.translated?.name || address.country?.name || 'Deutschland';
    return {
      label: 'Shopware Lieferadresse',
      company: this.text(address.company, 200),
      contactPerson: [this.text(address.firstName, 100), this.text(address.lastName, 100)].filter(Boolean).join(' '),
      street: this.text(address.street, 200),
      houseNumber: '',
      postalCode: this.text(address.zipcode, 20),
      city: this.text(address.city, 100),
      country: this.text(country, 100) || 'Deutschland',
      phone: this.text(address.phoneNumber, 50),
      notes: [
        this.text(address.additionalAddressLine1, 200),
        this.text(address.additionalAddressLine2, 200),
      ].filter(Boolean).join('\n'),
    };
  }

  private decimal(value: unknown, fallback = '0') {
    const parsed = typeof value === 'number' || typeof value === 'string' ? Number(value) : Number.NaN;
    return Number.isFinite(parsed) && parsed >= 0 ? parsed.toString() : fallback;
  }

  private mapShopwareProduct(product: ShopwareProduct): Omit<ArticleImportPreviewItem, 'status'> {
    const articleNumber = this.text(product.productNumber, 64);
    const isNumberedVariant = Boolean(product.parentId && articleNumber.includes('.'));
    const parentName = this.text(product.parent?.translated?.name || product.parent?.name, 200);
    const variantType = (product.options ?? [])
      .map((option) => {
        const group = this.text(option.group?.translated?.name || option.group?.name, 100);
        const value = this.text(option.translated?.name || option.name, 100);
        return group && value ? `${group}: ${value}` : value;
      })
      .filter(Boolean)
      .sort((left, right) => left.localeCompare(right, 'de'))
      .join(' · ')
      .slice(0, 500);
    const unit = product.unit?.translated?.name || product.unit?.name
      || product.unit?.translated?.shortCode || product.unit?.shortCode || 'Stück';
    const purchasePrice = product.purchasePrices?.[0];
    const salePrice = product.price?.[0];
    return {
      externalId: this.text(product.id, 64),
      articleNumber,
      name: isNumberedVariant && parentName
        ? parentName
        : this.text(product.translated?.name || product.name, 200),
      stock: this.decimal(product.stock),
      unit: this.text(unit, 100) || 'Stück',
      vatRate: this.decimal(product.tax?.taxRate, '19'),
      purchasePrice: this.decimal(purchasePrice?.net ?? purchasePrice?.gross),
      salePrice: this.decimal(salePrice?.net ?? salePrice?.gross),
      hasProductImage: Boolean(product.cover?.media?.url),
      isVariant: Boolean(product.parentId),
      variantType,
    };
  }

  private async fetchShopwareProductImage(product: ShopwareProduct, shopBaseUrl: string) {
    const media = product.cover?.media;
    if (!media?.url) return null;
    try {
      const shopUrl = new URL(shopBaseUrl);
      const imageUrl = new URL(media.url, `${shopBaseUrl}/`);
      if (imageUrl.protocol !== 'https:' || imageUrl.origin !== shopUrl.origin) return null;

      const response = await fetch(imageUrl, {
        headers: { Accept: 'image/*' },
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
      if (!response.ok) return null;
      const mimeType = this.text(response.headers.get('content-type')?.split(';')[0], 100).toLowerCase();
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(mimeType)) return null;
      const announcedSize = Number(response.headers.get('content-length'));
      if (Number.isFinite(announcedSize) && announcedSize > 2 * 1024 * 1024) return null;
      const bytes = await this.readBytes(response, 2 * 1024 * 1024);

      const extension = this.text(media.fileExtension, 12) || mimeType.split('/')[1] || 'jpg';
      const baseName = this.text(media.fileName, 180)
        || this.text(decodeURIComponent(imageUrl.pathname.split('/').pop() || ''), 180)
        || 'shopware-produktbild';
      const name = baseName.toLowerCase().endsWith(`.${extension.toLowerCase()}`) ? baseName : `${baseName}.${extension}`;
      return {
        name,
        category: 'Produktabbildung',
        reference: 'Aus Shopware importiert',
        version: '1',
        date: new Date().toISOString().slice(0, 10),
        description: 'Produktbild aus Shopware',
        mimeType,
        dataUrl: `data:${mimeType};base64,${bytes.toString('base64')}`,
      };
    } catch {
      return null;
    }
  }

  private async reconcileShopwareArticleVariants(integrationId: string) {
    const variants = await this.prisma.externalEntityReference.findMany({
      where: {
        integrationId,
        entityType: 'ARTICLE',
        articleId: { not: null },
        parentExternalId: { not: null },
      },
      select: { articleId: true, parentExternalId: true, variantType: true },
    });
    const parentExternalIds = [...new Set(variants.map((entry) => entry.parentExternalId).filter((id): id is string => Boolean(id)))];
    if (!parentExternalIds.length) return;
    const parents = await this.prisma.externalEntityReference.findMany({
      where: {
        integrationId,
        entityType: 'ARTICLE',
        externalId: { in: parentExternalIds },
        articleId: { not: null },
      },
      select: { externalId: true, articleId: true },
    });
    const parentArticles = new Map(parents.map((parent) => [parent.externalId, parent.articleId]));
    const links = variants.flatMap((variant) => {
      const articleId = parentArticles.get(variant.parentExternalId ?? '');
      return articleId && variant.articleId && articleId !== variant.articleId
        ? [{ articleId, variantArticleId: variant.articleId, variantType: variant.variantType }]
        : [];
    });
    if (links.length) {
      await this.prisma.$transaction(links.map((link) => this.prisma.articleVariantLink.upsert({
        where: {
          articleId_variantArticleId: {
            articleId: link.articleId,
            variantArticleId: link.variantArticleId,
          },
        },
        create: link,
        update: { variantType: link.variantType },
      })));
    }
  }

  private async markArticlePreviewStatuses(integrationId: string, products: ShopwareProduct[]) {
    const mapped = products.map((product) => this.mapShopwareProduct(product));
    const externalIds = mapped.map((product) => product.externalId).filter(Boolean);
    const articleNumbers = mapped.map((product) => product.articleNumber).filter(Boolean);
    const [references, duplicateArticles] = await Promise.all([
      this.prisma.externalEntityReference.findMany({
        where: { integrationId, entityType: 'ARTICLE', externalId: { in: externalIds } },
        select: { externalId: true },
      }),
      this.prisma.article.findMany({
        where: { articleNumber: { in: articleNumbers } },
        select: { articleNumber: true },
      }),
    ]);
    const referencedIds = new Set(references.map((reference) => reference.externalId));
    const existingNumbers = new Set(duplicateArticles.map((article) => article.articleNumber));
    return mapped.map((product): ArticleImportPreviewItem => ({
      ...product,
      status: !product.externalId || !product.articleNumber || !product.name
        ? 'INVALID'
        : referencedIds.has(product.externalId)
          ? 'ALREADY_IMPORTED'
          : existingNumbers.has(product.articleNumber)
            ? 'DUPLICATE'
            : 'READY',
    }));
  }

  private async assertCustomerImportAllowed(id: string) {
    const integration = await this.prisma.externalIntegration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException('Schnittstelle wurde nicht gefunden');
    if (!integration.active) throw new BadRequestException('Die Schnittstelle ist deaktiviert');
    if (!integration.allowImport) {
      throw new BadRequestException('Der Import muss zuerst unter Datenaustausch freigegeben werden');
    }
    if (integration.lastTestStatus !== 'SUCCESS') {
      throw new BadRequestException('Die Verbindung muss vor dem Import erfolgreich getestet werden');
    }
    return integration;
  }

  private async markPreviewStatuses(integrationId: string, customers: ShopwareCustomer[]) {
    const mapped = customers.map((customer) => this.mapShopwareCustomer(customer));
    const externalIds = mapped.map((customer) => customer.externalId).filter(Boolean);
    const customerNumbers = mapped.map((customer) => customer.customerNumber).filter(Boolean);
    const emails = mapped.map((customer) => customer.email).filter(Boolean);
    const [references, duplicateAddresses] = await Promise.all([
      this.prisma.externalEntityReference.findMany({
        where: { integrationId, entityType: 'CUSTOMER', externalId: { in: externalIds } },
        select: { externalId: true },
      }),
      this.prisma.address.findMany({
        where: {
          OR: [
            ...(customerNumbers.length ? [{ customerNumber: { in: customerNumbers } }] : []),
            ...(emails.length ? [{ email: { in: emails, mode: Prisma.QueryMode.insensitive } }] : []),
          ],
        },
        select: { customerNumber: true, email: true },
      }),
    ]);
    const referencedIds = new Set(references.map((reference) => reference.externalId));
    const existingNumbers = new Set(duplicateAddresses.map((address) => address.customerNumber).filter(Boolean));
    const existingEmails = new Set(duplicateAddresses.map((address) => address.email?.toLocaleLowerCase()).filter(Boolean));
    return mapped.map((customer): CustomerImportPreviewItem => ({
      ...customer,
      status: referencedIds.has(customer.externalId)
        ? 'ALREADY_IMPORTED'
        : (customer.customerNumber && existingNumbers.has(customer.customerNumber))
          || (customer.email && existingEmails.has(customer.email.toLocaleLowerCase()))
          ? 'DUPLICATE'
          : 'READY',
    }));
  }

  list() {
    return this.prisma.externalIntegration.findMany({ select: publicSelection, orderBy: { name: 'asc' } })
      .then((items) => items.map((item) => ({ ...item, credentialConfigured: true })));
  }

  async get(id: string) {
    const integration = await this.prisma.externalIntegration.findUnique({ where: { id }, select: publicSelection });
    if (!integration) throw new NotFoundException('Schnittstelle wurde nicht gefunden');
    return { ...integration, credentialConfigured: true };
  }

  async create(input: CreateExternalIntegrationDto) {
    const name = input.name.trim();
    const clientId = input.clientId.trim();
    if (!name || !clientId) throw new BadRequestException('Name und Client-ID sind erforderlich');
    const baseUrl = await this.normalizeBaseUrl(input.baseUrl);
    try {
      const created = await this.prisma.externalIntegration.create({
        data: {
          name,
          provider: input.provider,
          baseUrl,
          clientId,
          clientSecretEncrypted: this.encrypt(input.clientSecret),
          active: input.active ?? true,
        },
        select: publicSelection,
      });
      return { ...created, credentialConfigured: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Eine Schnittstelle mit diesem Namen ist bereits vorhanden');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateExternalIntegrationDto) {
    const existing = await this.prisma.externalIntegration.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Schnittstelle wurde nicht gefunden');
    const name = input.name?.trim();
    const clientId = input.clientId?.trim();
    if (name === '' || clientId === '') throw new BadRequestException('Name und Client-ID sind erforderlich');
    const baseUrl = input.baseUrl ? await this.normalizeBaseUrl(input.baseUrl) : undefined;
    try {
      const updated = await this.prisma.externalIntegration.update({
        where: { id },
        data: {
          name,
          baseUrl,
          clientId,
          clientSecretEncrypted: input.clientSecret ? this.encrypt(input.clientSecret) : undefined,
          active: input.active,
          cronEnabled: input.active === false ? false : undefined,
          lastTestStatus: input.baseUrl || input.clientId || input.clientSecret ? null : undefined,
          lastTestMessage: input.baseUrl || input.clientId || input.clientSecret ? null : undefined,
          lastTestedAt: input.baseUrl || input.clientId || input.clientSecret ? null : undefined,
        },
        select: publicSelection,
      });
      return { ...updated, credentialConfigured: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Eine Schnittstelle mit diesem Namen ist bereits vorhanden');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.externalIntegration.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Schnittstelle wurde nicht gefunden');
      }
      throw error;
    }
  }

  async updateDataPermissions(id: string, permissions: {
    allowImport: boolean;
    allowStockImport: boolean;
    allowExport: boolean;
    allowUpdate: boolean;
    allowDelete: boolean;
  }) {
    if (permissions.allowStockImport && !permissions.allowImport) {
      throw new BadRequestException('Der Lagerbestandsimport benötigt die allgemeine Importfreigabe');
    }
    try {
      const updated = await this.prisma.externalIntegration.update({
        where: { id },
        data: {
          ...permissions,
          cronEnabled: permissions.allowImport && permissions.allowStockImport ? undefined : false,
        },
        select: publicSelection,
      });
      return { ...updated, credentialConfigured: true };
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Schnittstelle wurde nicht gefunden');
      }
      throw error;
    }
  }

  async updateCronSettings(id: string, settings: { intervalMinutes: number; enabled: boolean }) {
    const integration = await this.prisma.externalIntegration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException('Schnittstelle wurde nicht gefunden');
    if (settings.enabled && !integration.active) {
      throw new BadRequestException('Der Cronjob kann nur für eine aktive Schnittstelle aktiviert werden');
    }
    if (settings.enabled && (!integration.allowImport || !integration.allowStockImport)) {
      throw new BadRequestException('Vor der Aktivierung müssen Import und Lagerbestandsimport freigegeben werden');
    }
    const updated = await this.prisma.externalIntegration.update({
      where: { id },
      data: {
        cronIntervalMinutes: settings.intervalMinutes,
        cronEnabled: settings.enabled,
        lastStockSyncAt: settings.enabled && !integration.cronEnabled ? null : undefined,
        lastStockSyncStatus: settings.enabled && !integration.cronEnabled ? null : undefined,
        lastStockSyncMessage: settings.enabled && !integration.cronEnabled ? null : undefined,
      },
      select: publicSelection,
    });
    return { ...updated, credentialConfigured: true };
  }

  async previewCustomerImport(id: string) {
    const integration = await this.assertCustomerImportAllowed(id);
    const result = await this.fetchShopwareCustomers(integration, 1, 10);
    const customers = await this.markPreviewStatuses(id, result.data);
    return {
      total: result.total,
      limit: 10,
      customers,
      writesPerformed: false,
    };
  }

  async latestCustomerImport(id: string) {
    await this.get(id);
    const job = await this.prisma.customerImportJob.findFirst({
      where: { integrationId: id },
      orderBy: { createdAt: 'desc' },
    });
    return { job };
  }

  async startCustomerImport(id: string) {
    await this.assertCustomerImportAllowed(id);
    const activeJob = await this.prisma.customerImportJob.findFirst({
      where: { integrationId: id, status: { in: ['RUNNING', 'PROCESSING'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (activeJob) return activeJob;
    return this.prisma.customerImportJob.create({
      data: { integrationId: id, status: 'RUNNING', page: 1, batchSize: 25 },
    });
  }

  async processNextCustomerImportBatch(integrationId: string, jobId: string) {
    const integration = await this.assertCustomerImportAllowed(integrationId);
    const locked = await this.prisma.customerImportJob.updateMany({
      where: { id: jobId, integrationId, status: 'RUNNING' },
      data: { status: 'PROCESSING', errorMessage: null },
    });
    if (locked.count !== 1) {
      const current = await this.prisma.customerImportJob.findFirst({ where: { id: jobId, integrationId } });
      if (!current) throw new NotFoundException('Importlauf wurde nicht gefunden');
      if (current.status === 'COMPLETED') return current;
      throw new ConflictException('Der nächste Importblock wird bereits verarbeitet');
    }

    const job = await this.prisma.customerImportJob.findUniqueOrThrow({ where: { id: jobId } });
    try {
      const result = await this.fetchShopwareCustomers(integration, job.page, job.batchSize);
      let imported = 0;
      let skipped = 0;
      let failed = 0;

      for (const customer of result.data) {
        const mapped = this.mapShopwareCustomer(customer);
        if (!mapped.externalId || (!mapped.company && !mapped.lastName)) {
          failed += 1;
          continue;
        }
        try {
          const alreadyImported = await this.prisma.externalEntityReference.findUnique({
            where: {
              integrationId_entityType_externalId: {
                integrationId,
                entityType: 'CUSTOMER',
                externalId: mapped.externalId,
              },
            },
          });
          if (alreadyImported) {
            skipped += 1;
            continue;
          }

          const duplicate = await this.prisma.address.findFirst({
            where: {
              OR: [
                ...(mapped.customerNumber ? [{ customerNumber: mapped.customerNumber }] : []),
                ...(mapped.email ? [{ email: { equals: mapped.email, mode: Prisma.QueryMode.insensitive } }] : []),
              ],
            },
            select: { id: true },
          });
          if (duplicate) {
            skipped += 1;
            continue;
          }

          const billing = customer.defaultBillingAddress;
          const shipping = customer.defaultShippingAddress;
          const salutation = customer.salutation?.translated?.displayName
            || customer.salutation?.displayName
            || billing?.salutation?.translated?.displayName
            || billing?.salutation?.displayName;
          const noteParts = [
            this.text(customer.customerComment, 9000),
            this.text(billing?.additionalAddressLine1, 400),
            this.text(billing?.additionalAddressLine2, 400),
          ].filter(Boolean);

          await this.prisma.$transaction(async (transaction) => {
            const address = await transaction.address.create({
              data: {
                customerNumber: mapped.customerNumber || null,
                type: 'KUNDE',
                company: mapped.company || null,
                salutation: this.text(salutation, 50) || null,
                firstName: mapped.firstName || null,
                lastName: mapped.lastName || null,
                street: mapped.street || null,
                postalCode: mapped.postalCode || null,
                city: mapped.city || null,
                country: mapped.country,
                email: mapped.email || null,
                phone: this.text(billing?.phoneNumber, 50) || null,
                taxNumber: this.text(customer.vatIds?.[0], 100) || null,
                notes: noteParts.join('\n') || null,
                bankData: {},
                deliveryAddresses: shipping && this.hasSeparateDeliveryAddress(billing, shipping)
                  ? [this.mapShopwareDeliveryAddress(shipping)]
                  : [],
                contacts: [],
                documents: [],
                purchasedItems: [],
              },
            });
            await transaction.externalEntityReference.create({
              data: {
                integrationId,
                entityType: 'CUSTOMER',
                externalId: mapped.externalId,
                addressId: address.id,
              },
            });
          });
          imported += 1;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            skipped += 1;
          } else {
            failed += 1;
          }
        }
      }

      const processed = job.processed + result.data.length;
      const total = Math.max(job.total, result.total);
      const completed = result.data.length < job.batchSize || processed >= total;
      return await this.prisma.customerImportJob.update({
        where: { id: job.id },
        data: {
          status: completed ? 'COMPLETED' : 'RUNNING',
          page: job.page + 1,
          total,
          processed,
          imported: { increment: imported },
          skipped: { increment: skipped },
          failed: { increment: failed },
          completedAt: completed ? new Date() : null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Importblock konnte nicht verarbeitet werden';
      await this.prisma.customerImportJob.update({
        where: { id: job.id },
        data: { status: 'RUNNING', errorMessage: message.slice(0, 1000) },
      });
      throw error;
    }
  }

  async previewArticleImport(id: string) {
    const integration = await this.assertCustomerImportAllowed(id);
    const result = await this.fetchShopwareProducts(integration, 1, 10);
    const articles = await this.markArticlePreviewStatuses(id, result.data);
    return { total: result.total, limit: 10, articles, writesPerformed: false };
  }

  async latestArticleImport(id: string) {
    await this.get(id);
    const job = await this.prisma.articleImportJob.findFirst({
      where: { integrationId: id },
      orderBy: { createdAt: 'desc' },
    });
    return { job };
  }

  async startArticleImport(id: string) {
    await this.assertCustomerImportAllowed(id);
    const activeJob = await this.prisma.articleImportJob.findFirst({
      where: { integrationId: id, status: { in: ['RUNNING', 'PROCESSING'] } },
      orderBy: { createdAt: 'desc' },
    });
    if (activeJob) return activeJob;
    return this.prisma.articleImportJob.create({
      data: { integrationId: id, status: 'RUNNING', page: 1, batchSize: 25 },
    });
  }

  private dimensionInCm(value: unknown) {
    const numeric = Number(this.decimal(value, '0'));
    return numeric > 0 ? (numeric / 10).toString() : null;
  }

  private async updateImportedArticleStock(
    articleId: string,
    importLocation: { id: string },
    stock: string,
  ) {
    const article = await this.prisma.article.findUnique({
      where: { id: articleId },
      select: { stockEntries: true },
    });
    if (!article) return;
    const existingEntries: Record<string, unknown>[] = Array.isArray(article.stockEntries)
      ? article.stockEntries.flatMap((entry) => (
        entry && typeof entry === 'object' && !Array.isArray(entry)
          ? [entry as Record<string, unknown>]
          : []
      ))
      : [];
    const shopwareEntry = {
      warehouseLocationId: importLocation.id,
      warehouseLocation: 'Shopware / Import / Bestand',
      stock,
      minimumStock: '0',
    };
    const stockEntries = [
      ...existingEntries.filter((entry) => entry.warehouseLocationId !== importLocation.id),
      shopwareEntry,
    ];
    const totalStock = stockEntries.reduce<number>((total, entry) => {
      const value = Number(entry.stock);
      return total + (Number.isFinite(value) && value >= 0 ? value : 0);
    }, 0);
    await this.prisma.article.update({
      where: { id: articleId },
      data: {
        stock: new Prisma.Decimal(totalStock.toString()),
        stockEntries: stockEntries as Prisma.InputJsonValue,
      },
    });
  }

  private async syncShopwareStocks(integration: {
    id: string;
    baseUrl: string;
    clientId: string;
    clientSecretEncrypted: string;
  }) {
    const importLocation = await this.prisma.warehouseLocation.upsert({
      where: {
        location_shelf_position: { location: 'Shopware', shelf: 'Import', position: 'Bestand' },
      },
      create: { location: 'Shopware', shelf: 'Import', position: 'Bestand' },
      update: {},
    });
    const batchSize = 25;
    let page = 1;
    let processed = 0;
    let updated = 0;
    let received = 0;
    do {
      const result = await this.fetchShopwareStockPage(integration, page, batchSize);
      received = result.data.length;
      const externalIds = result.data.map((product) => product.id);
      const references = await this.prisma.externalEntityReference.findMany({
        where: {
          integrationId: integration.id,
          entityType: 'ARTICLE',
          externalId: { in: externalIds },
          articleId: { not: null },
        },
        select: { externalId: true, articleId: true },
      });
      const articleIds = new Map(references.map((reference) => [reference.externalId, reference.articleId]));
      for (const product of result.data) {
        const articleId = articleIds.get(product.id);
        if (!articleId) continue;
        await this.updateImportedArticleStock(articleId, importLocation, this.decimal(product.stock));
        updated += 1;
      }
      processed += result.data.length;
      page += 1;
    } while (received === batchSize);
    return { updated, read: processed };
  }

  private async runDueStockImports() {
    if (this.stockCronChecking) return;
    this.stockCronChecking = true;
    try {
      const integrations = await this.prisma.externalIntegration.findMany({
        where: {
          active: true,
          cronEnabled: true,
          allowImport: true,
          allowStockImport: true,
          lastTestStatus: 'SUCCESS',
        },
      });
      const now = new Date();
      for (const integration of integrations) {
        const dueAt = integration.lastStockSyncAt
          ? integration.lastStockSyncAt.getTime() + integration.cronIntervalMinutes * 60000
          : 0;
        if (dueAt > now.getTime()) continue;
        const claimed = await this.prisma.externalIntegration.updateMany({
          where: { id: integration.id, lastStockSyncAt: integration.lastStockSyncAt },
          data: {
            lastStockSyncAt: now,
            lastStockSyncStatus: 'RUNNING',
            lastStockSyncMessage: 'Lagerbestände werden abgerufen.',
          },
        });
        if (claimed.count !== 1) continue;
        try {
          const result = await this.syncShopwareStocks(integration);
          await this.prisma.externalIntegration.update({
            where: { id: integration.id },
            data: {
              lastStockSyncStatus: 'SUCCESS',
              lastStockSyncMessage: `${result.updated} verknüpfte Artikel aktualisiert (${result.read} Shopware-Artikel gelesen).`,
            },
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Lagerbestandsabruf fehlgeschlagen';
          await this.prisma.externalIntegration.update({
            where: { id: integration.id },
            data: { lastStockSyncStatus: 'FAILED', lastStockSyncMessage: message.slice(0, 1000) },
          });
        }
      }
    } finally {
      this.stockCronChecking = false;
    }
  }

  async processNextArticleImportBatch(integrationId: string, jobId: string) {
    const integration = await this.assertCustomerImportAllowed(integrationId);
    const locked = await this.prisma.articleImportJob.updateMany({
      where: { id: jobId, integrationId, status: 'RUNNING' },
      data: { status: 'PROCESSING', errorMessage: null },
    });
    if (locked.count !== 1) {
      const current = await this.prisma.articleImportJob.findFirst({ where: { id: jobId, integrationId } });
      if (!current) throw new NotFoundException('Artikel-Importlauf wurde nicht gefunden');
      if (current.status === 'COMPLETED') return current;
      throw new ConflictException('Der nächste Importblock wird bereits verarbeitet');
    }

    const job = await this.prisma.articleImportJob.findUniqueOrThrow({ where: { id: jobId } });
    try {
      const result = await this.fetchShopwareProducts(integration, job.page, job.batchSize);
      const importLocation = await this.prisma.warehouseLocation.upsert({
        where: {
          location_shelf_position: { location: 'Shopware', shelf: 'Import', position: 'Bestand' },
        },
        create: { location: 'Shopware', shelf: 'Import', position: 'Bestand' },
        update: {},
      });
      let imported = 0;
      let skipped = 0;
      let failed = 0;
      const validFrom = new Date().toISOString().slice(0, 10);

      for (const product of result.data) {
        const mapped = this.mapShopwareProduct(product);
        if (!mapped.externalId || !mapped.articleNumber || !mapped.name) {
          failed += 1;
          continue;
        }
        try {
          const alreadyImported = await this.prisma.externalEntityReference.findUnique({
            where: {
              integrationId_entityType_externalId: {
                integrationId,
                entityType: 'ARTICLE',
                externalId: mapped.externalId,
              },
            },
          });
          if (alreadyImported) {
            if (alreadyImported.parentExternalId !== (product.parentId || null)
              || alreadyImported.variantType !== (mapped.variantType || null)) {
              await this.prisma.externalEntityReference.update({
                where: { id: alreadyImported.id },
                data: {
                  parentExternalId: product.parentId || null,
                  variantType: mapped.variantType || null,
                },
              });
            }
            skipped += 1;
            continue;
          }
          const duplicate = await this.prisma.article.findUnique({
            where: { articleNumber: mapped.articleNumber },
            select: { id: true },
          });
          if (duplicate) {
            skipped += 1;
            continue;
          }

          let unit = await this.prisma.articleUnit.findFirst({
            where: { name: { equals: mapped.unit, mode: 'insensitive' } },
          });
          unit ??= await this.prisma.articleUnit.create({ data: { name: mapped.unit } });
          const description = this.text(product.translated?.description || product.description, 10000);
          const productImage = await this.fetchShopwareProductImage(product, integration.baseUrl);
          const stockEntry = {
            warehouseLocationId: importLocation.id,
            warehouseLocation: 'Shopware / Import / Bestand',
            stock: integration.allowStockImport ? mapped.stock : '0',
            minimumStock: '0',
          };

          await this.prisma.$transaction(async (transaction) => {
            const article = await transaction.article.create({
              data: {
                articleNumber: mapped.articleNumber,
                name: mapped.name,
                type: 'VERKAUFSARTIKEL',
                stock: new Prisma.Decimal(integration.allowStockImport ? mapped.stock : '0'),
                stockEntries: [stockEntry],
                unitId: unit.id,
                vatRate: mapped.vatRate,
                netWeightKg: Number(product.weight) > 0 ? new Prisma.Decimal(this.decimal(product.weight)) : null,
                lengthCm: this.dimensionInCm(product.length),
                widthCm: this.dimensionInCm(product.width),
                heightCm: this.dimensionInCm(product.height),
                notes: description || null,
                purchasePrices: [{ netPrice: mapped.purchasePrice, validFrom, note: 'Import aus Shopware' }],
                salePrices: [{ netPrice: mapped.salePrice, validFrom, note: 'Import aus Shopware' }],
                positions: [],
                externalNumbers: product.ean ? [{ type: 'EAN', number: this.text(product.ean, 100) }] : [],
                files: productImage ? [productImage] : [],
                purchasing: {},
              },
            });
            await transaction.externalEntityReference.create({
              data: {
                integrationId,
                entityType: 'ARTICLE',
                externalId: mapped.externalId,
                parentExternalId: product.parentId || null,
                variantType: mapped.variantType || null,
                articleId: article.id,
              },
            });
          });
          imported += 1;
        } catch (error) {
          if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            skipped += 1;
          } else {
            failed += 1;
          }
        }
      }

      await this.reconcileShopwareArticleVariants(integrationId);

      const processed = job.processed + result.data.length;
      const total = Math.max(job.total, result.total);
      const completed = result.data.length < job.batchSize || processed >= total;
      return await this.prisma.articleImportJob.update({
        where: { id: job.id },
        data: {
          status: completed ? 'COMPLETED' : 'RUNNING',
          page: job.page + 1,
          total,
          processed,
          imported: { increment: imported },
          skipped: { increment: skipped },
          failed: { increment: failed },
          completedAt: completed ? new Date() : null,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Importblock konnte nicht verarbeitet werden';
      await this.prisma.articleImportJob.update({
        where: { id: job.id },
        data: { status: 'RUNNING', errorMessage: message.slice(0, 1000) },
      });
      throw error;
    }
  }

  async test(id: string) {
    const integration = await this.prisma.externalIntegration.findUnique({ where: { id } });
    if (!integration) throw new NotFoundException('Schnittstelle wurde nicht gefunden');

    let success = false;
    let message = 'Verbindung konnte nicht hergestellt werden.';
    try {
      const baseUrl = await this.normalizeBaseUrl(integration.baseUrl);
      const response = await fetch(`${baseUrl}/api/oauth/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          grant_type: 'client_credentials',
          client_id: integration.clientId,
          client_secret: this.decrypt(integration.clientSecretEncrypted),
        }),
        signal: AbortSignal.timeout(10000),
        redirect: 'error',
      });
      success = response.ok;
      await response.body?.cancel();
      message = success
        ? 'Verbindung zu Shopware wurde erfolgreich hergestellt.'
        : `Shopware hat die Anmeldung abgelehnt (HTTP ${response.status}).`;
    } catch (error) {
      message = error instanceof BadRequestException
        ? error.message
        : error instanceof Error && error.name === 'TimeoutError'
        ? 'Zeitüberschreitung beim Verbindungsaufbau.'
        : 'Shopware ist unter der angegebenen URL nicht erreichbar.';
    }

    await this.prisma.externalIntegration.update({
      where: { id },
      data: { lastTestedAt: new Date(), lastTestStatus: success ? 'SUCCESS' : 'FAILED', lastTestMessage: message },
    });
    return { success, message };
  }
}
