import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@Injectable()
export class ArticlesService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    return this.prisma.article.findMany({
      omit: { files: true },
      include: {
        unit: true,
        variantLinks: {
          include: { variantArticle: { omit: { files: true }, include: { unit: true } } },
          orderBy: { variantArticle: { articleNumber: 'asc' } },
        },
      },
      orderBy: [{ articleNumber: 'asc' }],
    });
  }

  async get(id: string) {
    const article = await this.prisma.article.findUnique({
      where: { id },
      include: {
        unit: true,
        variantLinks: { include: { variantArticle: { include: { unit: true } } }, orderBy: { variantArticle: { articleNumber: 'asc' } } },
      },
    });
    if (!article) throw new NotFoundException('Artikel wurde nicht gefunden');
    return article;
  }

  private async validate(input: CreateArticleDto | UpdateArticleDto, existing?: {
    id: string;
    articleNumber: string;
    name: string;
    type: string;
    positions: Prisma.JsonValue | null;
    purchasePrices: Prisma.JsonValue | null;
    salePrices: Prisma.JsonValue | null;
    stockEntries: Prisma.JsonValue | null;
    netWeightKg: Prisma.Decimal | null;
    grossWeightKg: Prisma.Decimal | null;
    lengthCm: Prisma.Decimal | null;
    widthCm: Prisma.Decimal | null;
    heightCm: Prisma.Decimal | null;
  }) {
    const articleNumber = input.articleNumber === undefined ? existing?.articleNumber : input.articleNumber;
    const name = input.name === undefined ? existing?.name : input.name;
    const type = input.type === undefined ? existing?.type : input.type;
    const positions = input.positions === undefined ? existing?.positions : input.positions;
    const purchasePrices = input.purchasePrices === undefined ? existing?.purchasePrices : input.purchasePrices;
    const salePrices = input.salePrices === undefined ? existing?.salePrices : input.salePrices;
    const stockEntries = input.stockEntries === undefined ? existing?.stockEntries : input.stockEntries;
    const files = input.files === undefined ? undefined : input.files;
    const numericValue = (value: string | undefined, previous: Prisma.Decimal | null | undefined) =>
      value === undefined ? (previous == null ? null : Number(previous)) : (value.trim() === '' ? null : Number(value));
    const netWeightKg = numericValue(input.netWeightKg, existing?.netWeightKg);
    const grossWeightKg = numericValue(input.grossWeightKg, existing?.grossWeightKg);
    const lengthCm = numericValue(input.lengthCm, existing?.lengthCm);
    const widthCm = numericValue(input.widthCm, existing?.widthCm);
    const heightCm = numericValue(input.heightCm, existing?.heightCm);

    const validPriceCount = (prices: Prisma.JsonValue | Record<string, string>[] | undefined) => {
      if (!Array.isArray(prices)) return 0;
      return prices.filter((price) => {
        if (typeof price !== 'object' || price === null || Array.isArray(price)) return false;
        const row = price as Record<string, unknown>;
        if (typeof row.netPrice !== 'string' || typeof row.validFrom !== 'string') return false;
        const netPrice = Number(row.netPrice);
        const validFrom = new Date(`${row.validFrom}T00:00:00Z`);
        return row.netPrice.trim() !== '' && Number.isFinite(netPrice) && netPrice >= 0
          && /^\d{4}-\d{2}-\d{2}$/.test(row.validFrom)
          && !Number.isNaN(validFrom.getTime())
          && validFrom.toISOString().startsWith(row.validFrom);
      }).length;
    };

    if (!articleNumber?.trim()) throw new BadRequestException('Artikelnummer muss angegeben werden');
    if (!name?.trim()) throw new BadRequestException('Bezeichnung muss angegeben werden');
    if (!validPriceCount(purchasePrices)) throw new BadRequestException('Mindestens ein EK-Nettopreis mit Datum ist erforderlich');
    if (!validPriceCount(salePrices)) throw new BadRequestException('Mindestens ein VK-Nettopreis mit Datum ist erforderlich');
    if (files) {
      if (files.some((file) => Boolean(file.dataUrl))) {
        throw new BadRequestException('Bildinhalte dürfen nicht in den Artikeldaten gespeichert werden');
      }
      const productImages = files.filter((file) => file.category === 'Produktabbildung');
      if (productImages.length > 1) throw new BadRequestException('Pro Artikel ist nur eine Produktabbildung erlaubt');
      const productImage = productImages[0];
      if (productImage && !productImage.reference?.startsWith('/api/article-images/')) {
        throw new BadRequestException('Die Produktabbildung besitzt keine gültige Dateireferenz');
      }
    }
    if ([netWeightKg, grossWeightKg].some((value) => value !== null && (!Number.isFinite(value) || value < 0))) {
      throw new BadRequestException('Gewichtsangaben dürfen nicht negativ sein');
    }
    if (netWeightKg !== null && grossWeightKg !== null && grossWeightKg < netWeightKg) {
      throw new BadRequestException('Das Bruttogewicht darf nicht kleiner als das Nettogewicht sein');
    }
    if ([lengthCm, widthCm, heightCm].some((value) => value !== null && (!Number.isFinite(value) || value <= 0))) {
      throw new BadRequestException('Angegebene Abmessungen müssen größer als 0 sein');
    }
    if (!Array.isArray(stockEntries) || stockEntries.length === 0) {
      throw new BadRequestException('Mindestens ein Lagerplatz mit Bestand und Mindestbestand ist erforderlich');
    }
    const warehouseLocationIds: string[] = [];
    for (const entry of stockEntries) {
      if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        throw new BadRequestException('Ungültiger Lagerbestand');
      }
      const row = entry as Record<string, unknown>;
      const stock = typeof row.stock === 'string' && row.stock.trim() !== '' ? Number(row.stock) : Number.NaN;
      const minimumStock = typeof row.minimumStock === 'string' && row.minimumStock.trim() !== ''
        ? Number(row.minimumStock)
        : Number.NaN;
      if (typeof row.warehouseLocationId !== 'string' || !row.warehouseLocationId.trim()
        || !Number.isFinite(stock) || stock < 0 || !Number.isFinite(minimumStock) || minimumStock < 0) {
        throw new BadRequestException('Lagerplatz, Bestand und Mindestbestand müssen vollständig und gültig sein');
      }
      warehouseLocationIds.push(row.warehouseLocationId);
    }
    if (new Set(warehouseLocationIds).size !== warehouseLocationIds.length) {
      throw new BadRequestException('Ein Lagerplatz darf je Artikel nur einmal verwendet werden');
    }
    const existingWarehouseLocationCount = await this.prisma.warehouseLocation.count({
      where: { id: { in: warehouseLocationIds } },
    });
    if (existingWarehouseLocationCount !== warehouseLocationIds.length) {
      throw new BadRequestException('Mindestens ein gewählter Lagerplatz ist nicht vorhanden');
    }
    if (input.variantIds !== undefined) {
      if (existing && input.variantIds.includes(existing.id)) {
        throw new BadRequestException('Ein Artikel kann nicht mit sich selbst als Variante verknüpft werden');
      }
      const variantCount = await this.prisma.article.count({ where: { id: { in: input.variantIds } } });
      if (variantCount !== input.variantIds.length) {
        throw new BadRequestException('Mindestens ein gewählter Variantenartikel ist nicht vorhanden');
      }
    }
    if (['PRODUKTIONSARTIKEL', 'STUECKLISTENARTIKEL'].includes(type ?? '')
      && (!Array.isArray(positions) || positions.length < 2)) {
      throw new BadRequestException('Produktions- und Stücklistenartikel benötigen mindestens zwei Positionen');
    }
  }

  private data(input: CreateArticleDto | UpdateArticleDto) {
    const { variantIds: _variantIds, ...articleInput } = input;
    const optionalDecimal = (value: string | undefined) =>
      value === undefined ? undefined : (value.trim() === '' ? null : new Prisma.Decimal(value));
    const calculatedStock = input.stockEntries === undefined
      ? (input.stock === undefined ? undefined : new Prisma.Decimal(input.stock || '0'))
      : new Prisma.Decimal(input.stockEntries.reduce((total, entry) => total + Number(entry.stock || 0), 0).toString());
    return {
      ...articleInput,
      articleNumber: input.articleNumber?.trim(),
      name: input.name?.trim(),
      stock: calculatedStock,
      stockEntries: input.stockEntries === undefined ? undefined : input.stockEntries as Prisma.InputJsonValue,
      netWeightKg: optionalDecimal(input.netWeightKg),
      grossWeightKg: optionalDecimal(input.grossWeightKg),
      lengthCm: optionalDecimal(input.lengthCm),
      widthCm: optionalDecimal(input.widthCm),
      heightCm: optionalDecimal(input.heightCm),
      purchasePrices: input.purchasePrices === undefined ? undefined : input.purchasePrices as Prisma.InputJsonValue,
      salePrices: input.salePrices === undefined ? undefined : input.salePrices as Prisma.InputJsonValue,
      positions: input.positions === undefined ? undefined : input.positions as Prisma.InputJsonValue,
      externalNumbers: input.externalNumbers === undefined ? undefined : input.externalNumbers as Prisma.InputJsonValue,
      files: input.files === undefined ? undefined : input.files as Prisma.InputJsonValue,
      purchasing: input.purchasing === undefined ? undefined : input.purchasing as Prisma.InputJsonValue,
    };
  }

  async create(input: CreateArticleDto) {
    await this.validate(input);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        const article = await transaction.article.create({
          data: {
            ...this.data(input),
            articleNumber: input.articleNumber.trim(),
            name: input.name.trim(),
            type: input.type,
            unitId: input.unitId,
            stock: new Prisma.Decimal((input.stockEntries ?? []).reduce((total, entry) => total + Number(entry.stock || 0), 0).toString()),
            stockEntries: (input.stockEntries ?? []) as Prisma.InputJsonValue,
            vatRate: input.vatRate || '19',
            purchasePrices: (input.purchasePrices ?? []) as Prisma.InputJsonValue,
            salePrices: (input.salePrices ?? []) as Prisma.InputJsonValue,
            positions: (input.positions ?? []) as Prisma.InputJsonValue,
            externalNumbers: (input.externalNumbers ?? []) as Prisma.InputJsonValue,
            files: (input.files ?? []) as Prisma.InputJsonValue,
            purchasing: (input.purchasing ?? {}) as Prisma.InputJsonValue,
          },
        });
        if (input.variantIds?.length) {
          await transaction.articleVariantLink.createMany({
            data: input.variantIds.map((variantArticleId) => ({ articleId: article.id, variantArticleId })),
          });
        }
        return transaction.article.findUniqueOrThrow({
          where: { id: article.id },
          include: { unit: true, variantLinks: { include: { variantArticle: { include: { unit: true } } } } },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Diese Artikelnummer ist bereits vergeben');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Die gewählte Einheit ist nicht vorhanden');
      }
      throw error;
    }
  }

  async update(id: string, input: UpdateArticleDto) {
    const existing = await this.prisma.article.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Artikel wurde nicht gefunden');
    await this.validate(input, existing);
    try {
      return await this.prisma.$transaction(async (transaction) => {
        await transaction.article.update({ where: { id }, data: this.data(input) });
        if (input.variantIds !== undefined) {
          const currentVariantLinks = await transaction.articleVariantLink.findMany({
            where: { articleId: id },
            select: { variantArticleId: true, variantType: true },
          });
          const variantTypes = new Map(currentVariantLinks.map((link) => [link.variantArticleId, link.variantType]));
          await transaction.articleVariantLink.deleteMany({ where: { articleId: id } });
          if (input.variantIds.length) {
            await transaction.articleVariantLink.createMany({
              data: input.variantIds.map((variantArticleId) => ({
                articleId: id,
                variantArticleId,
                variantType: variantTypes.get(variantArticleId) ?? null,
              })),
            });
          }
        }
        return transaction.article.findUniqueOrThrow({
          where: { id },
          include: { unit: true, variantLinks: { include: { variantArticle: { include: { unit: true } } } } },
        });
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Diese Artikelnummer ist bereits vergeben');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Die gewählte Einheit ist nicht vorhanden');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Artikel wurde nicht gefunden');
      }
      throw error;
    }
  }
}
