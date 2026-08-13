import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { ListAddressesQueryDto } from './dto/list-addresses-query.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: ListAddressesQueryDto) {
    const search = query.search?.trim();
    const addressNumber = search && /^ADR-?\d+$/i.test(search)
      ? Number(search.replace(/^ADR-?/i, ''))
      : search && /^\d+$/.test(search)
        ? Number(search)
        : undefined;
    const where: Prisma.AddressWhereInput | undefined = search
      ? {
          OR: [
            ...(addressNumber !== undefined ? [{ addressNumber }] : []),
            { customerNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { company: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { firstName: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { lastName: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { street: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { houseNumber: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { postalCode: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { city: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { email: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { phone: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { mobile: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { type: { contains: search, mode: Prisma.QueryMode.insensitive } },
            { specification: { name: { contains: search, mode: Prisma.QueryMode.insensitive } } },
          ],
        }
      : undefined;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.address.findMany({
        where,
        include: { specification: true },
        orderBy: [{ company: 'asc' }, { lastName: 'asc' }, { addressNumber: 'asc' }],
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
      }),
      this.prisma.address.count({ where }),
    ]);

    return {
      items,
      total,
      page: query.page,
      pageSize: query.pageSize,
      totalPages: Math.max(1, Math.ceil(total / query.pageSize)),
    };
  }

  create(input: CreateAddressDto) {
    if (!input.company?.trim() && !input.lastName?.trim()) {
      throw new BadRequestException('Firma oder Nachname muss angegeben werden');
    }

    return this.prisma.address.create({
      data: {
        ...input,
        specificationId: input.specificationId || null,
        type: input.type ?? 'KUNDE',
        country: input.country || 'Deutschland',
        bankData: (input.bankData ?? {}) as Prisma.InputJsonValue,
        deliveryAddresses: (input.deliveryAddresses ?? []) as Prisma.InputJsonValue,
        contacts: (input.contacts ?? []) as Prisma.InputJsonValue,
        documents: (input.documents ?? []) as Prisma.InputJsonValue,
        purchasedItems: (input.purchasedItems ?? []) as Prisma.InputJsonValue,
      },
      include: { specification: true },
    });
  }

  async update(id: string, input: UpdateAddressDto) {
    const existing = await this.prisma.address.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Adresse wurde nicht gefunden');

    const company = input.company === undefined ? existing.company : input.company;
    const lastName = input.lastName === undefined ? existing.lastName : input.lastName;
    if (!company?.trim() && !lastName?.trim()) {
      throw new BadRequestException('Firma oder Nachname muss angegeben werden');
    }

    try {
      return await this.prisma.address.update({
        where: { id },
        data: {
          ...input,
          specificationId: input.specificationId === undefined ? undefined : input.specificationId || null,
          bankData: input.bankData === undefined ? undefined : input.bankData as Prisma.InputJsonValue,
          deliveryAddresses: input.deliveryAddresses === undefined ? undefined : input.deliveryAddresses as Prisma.InputJsonValue,
          contacts: input.contacts === undefined ? undefined : input.contacts as Prisma.InputJsonValue,
          documents: input.documents === undefined ? undefined : input.documents as Prisma.InputJsonValue,
          purchasedItems: input.purchasedItems === undefined ? undefined : input.purchasedItems as Prisma.InputJsonValue,
        },
        include: { specification: true },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Adresse wurde nicht gefunden');
      }
      throw error;
    }
  }
}
