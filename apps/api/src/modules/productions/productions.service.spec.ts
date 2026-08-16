import { BadRequestException } from '@nestjs/common';
import { ProductionsService } from './productions.service';

describe('ProductionsService', () => {
  const prisma = {
    productionInstruction: { findUnique: jest.fn() },
    production: { create: jest.fn(), findMany: jest.fn() },
  };
  const service = new ProductionsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('lädt für die Übersicht nur die benötigten Schrittfelder', async () => {
    prisma.production.findMany.mockResolvedValue([]);

    await service.list();

    expect(prisma.production.findMany).toHaveBeenCalledWith(expect.objectContaining({
      select: expect.objectContaining({
        elements: {
          orderBy: { position: 'asc' },
          select: expect.objectContaining({
            steps: {
              orderBy: { position: 'asc' },
              select: { id: true, position: true, name: true, status: true },
            },
          }),
        },
      }),
      orderBy: { productionNumber: 'desc' },
    }));
  });

  it('erzeugt eine Produktion ausschließlich als Kopie der Anweisung', async () => {
    const instruction = {
      id: 'd812681c-bc97-457b-b3df-754cc4a42a17',
      instructionNumber: 12,
      articleId: '9a5b4f42-c11e-4cc8-9f7a-705382f98d7c',
      name: 'Produkt Alpha',
      elements: [{
        position: 1,
        name: 'Gehäuse',
        steps: [{
          position: 1,
          name: 'Montage',
          workType: 'PHYSICAL_WORK',
          controlActive: true,
          employeeInstruction: 'Gehäuse montieren',
          employeeInstructionActive: true,
          confirmationRequired: true,
          plannedHours: 0,
          plannedMinutes: 30,
          timeEstimateActive: true,
          timerHours: 0,
          timerMinutes: 30,
          timerActive: true,
          serialNumberMode: 'GENERATOR',
          serialNumberActive: true,
        }],
      }],
    };
    prisma.productionInstruction.findUnique.mockResolvedValue(instruction);
    prisma.production.create.mockImplementation(async ({ data }) => ({ id: 'production-id', ...data }));

    await service.create({
      productionInstructionId: instruction.id,
      startDate: '2026-08-15',
      completionDate: '2026-08-20',
    });

    expect(prisma.production.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        productionInstructionId: instruction.id,
        instructionNumber: 12,
        articleId: instruction.articleId,
        name: 'Produkt Alpha',
        startDate: new Date('2026-08-15T00:00:00.000Z'),
        completionDate: new Date('2026-08-20T00:00:00.000Z'),
        plannedDays: 6,
        status: 'PLANNED',
        elements: {
          create: [expect.objectContaining({
            position: 1,
            name: 'Gehäuse',
            steps: { create: [expect.objectContaining({ name: 'Montage', status: 'NOT_STARTED' })] },
          })],
        },
      }),
    }));
  });

  it('verhindert eine Produktion ohne vorhandene Anweisung', async () => {
    prisma.productionInstruction.findUnique.mockResolvedValue(null);

    await expect(service.create({
      productionInstructionId: 'd812681c-bc97-457b-b3df-754cc4a42a17',
      startDate: '2026-08-15',
      completionDate: '2026-08-20',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.production.create).not.toHaveBeenCalled();
  });

  it('verhindert ein Produktionsende vor dem Produktionsstart', async () => {
    await expect(service.create({
      productionInstructionId: 'd812681c-bc97-457b-b3df-754cc4a42a17',
      startDate: '2026-08-20',
      completionDate: '2026-08-15',
    })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productionInstruction.findUnique).not.toHaveBeenCalled();
    expect(prisma.production.create).not.toHaveBeenCalled();
  });
});
