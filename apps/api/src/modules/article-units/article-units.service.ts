import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class ArticleUnitsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.articleUnit.findMany({ orderBy: { name: 'asc' } });
  }

  private async ensureUnique(name: string, excludedId?: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new BadRequestException('Bezeichnung ist erforderlich');
    const existing = await this.prisma.articleUnit.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' }, id: excludedId ? { not: excludedId } : undefined },
    });
    if (existing) throw new ConflictException('Diese Einheit ist bereits vorhanden');
    return normalizedName;
  }

  async create(name: string) {
    const normalizedName = await this.ensureUnique(name);
    try {
      return await this.prisma.articleUnit.create({ data: { name: normalizedName } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Diese Einheit ist bereits vorhanden');
      }
      throw error;
    }
  }

  async update(id: string, name: string | undefined) {
    const existing = await this.prisma.articleUnit.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Einheit wurde nicht gefunden');
    const normalizedName = name === undefined ? existing.name : await this.ensureUnique(name, id);
    try {
      return await this.prisma.articleUnit.update({ where: { id }, data: { name: normalizedName } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Diese Einheit ist bereits vorhanden');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.articleUnit.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2025') throw new NotFoundException('Einheit wurde nicht gefunden');
        if (error.code === 'P2003') throw new ConflictException('Verwendete Einheiten können nicht gelöscht werden');
      }
      throw error;
    }
  }
}
