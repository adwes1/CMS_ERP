import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { WarehouseLocationDto } from './dto/warehouse-location.dto';

@Injectable()
export class WarehouseLocationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.warehouseLocation.findMany({
      orderBy: [{ location: 'asc' }, { shelf: 'asc' }, { position: 'asc' }],
    });
  }

  private normalize(input: WarehouseLocationDto) {
    const optionalDecimal = (value: string | undefined, label: string) => {
      if (value === undefined || value.trim() === '') return null;
      const numericValue = Number(value);
      if (!Number.isFinite(numericValue) || numericValue <= 0) {
        throw new BadRequestException(`${label} muss größer als 0 sein`);
      }
      return new Prisma.Decimal(value);
    };
    const values = {
      location: input.location.trim(),
      shelf: input.shelf.trim(),
      position: input.position.trim(),
      maxWeight: optionalDecimal(input.maxWeight, 'Das Maximalgewicht'),
      length: optionalDecimal(input.length, 'Die Länge'),
      width: optionalDecimal(input.width, 'Die Breite'),
      depth: optionalDecimal(input.depth, 'Die Tiefe'),
    };
    if (!values.location || !values.shelf || !values.position) {
      throw new BadRequestException('Ort, Regal und Platz sind erforderlich');
    }
    return values;
  }

  private async ensureUnique(input: WarehouseLocationDto, excludedId?: string) {
    const values = this.normalize(input);
    const existing = await this.prisma.warehouseLocation.findFirst({
      where: {
        id: excludedId ? { not: excludedId } : undefined,
        location: { equals: values.location, mode: 'insensitive' },
        shelf: { equals: values.shelf, mode: 'insensitive' },
        position: { equals: values.position, mode: 'insensitive' },
      },
    });
    if (existing) throw new ConflictException('Dieser Lagerplatz ist bereits vorhanden');
    return values;
  }

  async create(input: WarehouseLocationDto) {
    const data = await this.ensureUnique(input);
    try {
      return await this.prisma.warehouseLocation.create({ data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Dieser Lagerplatz ist bereits vorhanden');
      }
      throw error;
    }
  }

  async update(id: string, input: WarehouseLocationDto) {
    const existing = await this.prisma.warehouseLocation.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Lagerplatz wurde nicht gefunden');
    const data = await this.ensureUnique(input, id);
    try {
      return await this.prisma.warehouseLocation.update({ where: { id }, data });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Dieser Lagerplatz ist bereits vorhanden');
      }
      throw error;
    }
  }

  async remove(id: string) {
    const usedByArticle = await this.prisma.article.count({
      where: { stockEntries: { array_contains: [{ warehouseLocationId: id }] } },
    });
    if (usedByArticle) {
      throw new ConflictException('Verwendete Lagerplätze können nicht gelöscht werden');
    }
    try {
      await this.prisma.warehouseLocation.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Lagerplatz wurde nicht gefunden');
      }
      throw error;
    }
  }
}
