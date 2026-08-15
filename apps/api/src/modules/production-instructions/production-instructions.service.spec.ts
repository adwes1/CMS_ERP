import { BadRequestException } from '@nestjs/common';
import { ProductionInstructionsService } from './production-instructions.service';
import { SaveProductionInstructionDto } from './dto/production-instruction.dto';

const step = {
  name: 'Montage',
  workType: 'PHYSICAL_WORK' as const,
  controlActive: true,
  employeeInstruction: 'Bauteile montieren',
  employeeInstructionActive: true,
  confirmationRequired: true,
  plannedHours: 0,
  plannedMinutes: 30,
  timeEstimateActive: true,
  timerHours: 0,
  timerMinutes: 30,
  timerActive: true,
  serialNumberMode: 'GENERATOR' as const,
  serialNumberActive: true,
};

const input: SaveProductionInstructionDto = {
  articleId: '758196a8-b948-42e9-83d1-8a65827ba830',
  startDate: '2026-08-15',
  completionDate: '2026-08-16',
  partCount: 2,
  elements: [
    { name: 'Gehäuse', steps: [step] },
    { name: 'Deckel', steps: [{ ...step, name: 'Prüfung', workType: 'PROCESS' }] },
  ],
};

describe('ProductionInstructionsService', () => {
  const prisma = {
    article: { findUnique: jest.fn() },
    productionInstruction: { create: jest.fn(), findMany: jest.fn() },
  };
  const service = new ProductionInstructionsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('liefert in der Übersicht nur Zähler statt aller Produktionsschritte', async () => {
    prisma.productionInstruction.findMany.mockResolvedValue([{
      id: 'instruction-id',
      instructionNumber: 1,
      article: { id: input.articleId, articleNumber: 'P-1', name: 'Produkt Alpha', type: 'PRODUKTIONSARTIKEL' },
      elements: [{ _count: { steps: 2 } }, { _count: { steps: 3 } }],
    }]);

    await expect(service.list()).resolves.toEqual([expect.objectContaining({
      id: 'instruction-id',
      elementCount: 2,
      stepCount: 5,
    })]);
    expect(prisma.productionInstruction.findMany).toHaveBeenCalledWith({
      include: {
        article: { select: { id: true, articleNumber: true, name: true, type: true } },
        elements: { select: { _count: { select: { steps: true } } } },
      },
      orderBy: { instructionNumber: 'desc' },
    });
  });

  it('übernimmt den Artikelnamen und nummeriert Elemente und Schritte', async () => {
    prisma.article.findUnique.mockResolvedValue({ id: input.articleId, name: 'Produkt Alpha', type: 'PRODUKTIONSARTIKEL' });
    prisma.productionInstruction.create.mockImplementation(async ({ data }) => ({ id: 'instruction-id', ...data }));

    await service.create(input);

    expect(prisma.productionInstruction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        name: 'Produkt Alpha',
        partCount: 2,
        elements: {
          create: [
            expect.objectContaining({ position: 1, name: 'Gehäuse', steps: { create: [expect.objectContaining({ position: 1, name: 'Montage' })] } }),
            expect.objectContaining({ position: 2, name: 'Deckel', steps: { create: [expect.objectContaining({ position: 1, name: 'Prüfung' })] } }),
          ],
        },
      }),
    }));
  });

  it('verhindert ein Abschlussdatum vor dem Startdatum', async () => {
    await expect(service.create({ ...input, completionDate: '2026-08-14' })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productionInstruction.create).not.toHaveBeenCalled();
  });

  it('verhindert eine abweichende Anzahl von Produktelementen', async () => {
    await expect(service.create({ ...input, partCount: 3 })).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.productionInstruction.create).not.toHaveBeenCalled();
  });

  it('begrenzt die Gesamtzahl der Produktionsschritte', async () => {
    const oversizedInput = {
      ...input,
      partCount: 6,
      elements: Array.from({ length: 6 }, (_, index) => ({
        name: `Teil ${index + 1}`,
        steps: Array.from({ length: 200 }, () => ({ ...step })),
      })),
    };

    await expect(service.create(oversizedInput)).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.article.findUnique).not.toHaveBeenCalled();
    expect(prisma.productionInstruction.create).not.toHaveBeenCalled();
  });
});
