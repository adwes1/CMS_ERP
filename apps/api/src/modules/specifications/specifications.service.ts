import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class SpecificationsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.specification.findMany({ orderBy: { name: 'asc' } });
  }

  async create(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new BadRequestException('Bezeichnung ist erforderlich');
    const existing = await this.prisma.specification.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('Diese Spezifikation ist bereits vorhanden');
    try {
      return await this.prisma.specification.create({ data: { name: normalizedName } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Diese Spezifikation ist bereits vorhanden');
      }
      throw error;
    }
  }

  async update(id: string, name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new BadRequestException('Bezeichnung ist erforderlich');
    const existing = await this.prisma.specification.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' }, NOT: { id } },
    });
    if (existing) throw new ConflictException('Diese Spezifikation ist bereits vorhanden');
    try {
      return await this.prisma.specification.update({ where: { id }, data: { name: normalizedName } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException('Spezifikation wurde nicht gefunden');
        if (error.code === 'P2002') throw new ConflictException('Diese Spezifikation ist bereits vorhanden');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.specification.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException('Spezifikation wurde nicht gefunden');
        if (error.code === 'P2003') {
          throw new ConflictException('Verwendete Spezifikationen können nicht gelöscht werden');
        }
      }
      throw error;
    }
  }
}
