import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.paymentMethod.findMany({ orderBy: { name: 'asc' } });
  }

  async create(name: string) {
    const normalizedName = name.trim();
    if (!normalizedName) throw new BadRequestException('Bezeichnung ist erforderlich');

    const existing = await this.prisma.paymentMethod.findFirst({
      where: { name: { equals: normalizedName, mode: 'insensitive' } },
    });
    if (existing) throw new ConflictException('Diese Zahlungsart ist bereits vorhanden');

    try {
      return await this.prisma.paymentMethod.create({ data: { name: normalizedName } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
        throw new ConflictException('Diese Zahlungsart ist bereits vorhanden');
      }
      throw error;
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.paymentMethod.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Zahlungsart wurde nicht gefunden');
      }
      throw error;
    }
  }
}
