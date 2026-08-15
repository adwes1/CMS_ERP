import { BadRequestException } from '@nestjs/common';
import { ProductionsService } from './productions.service';

describe('ProductionsService', () => {
  const prisma = {
    productionInstruction: { findUnique: jest.fn() },
    production: { create: jest.fn() },
  };
  const service = new ProductionsService(prisma as never);

  beforeEach(() => jest.clearAllMocks());

  it('erzeugt eine Produktion ausschließlich als Kopie der Anweisung', async () => {
    const instruction = {
      id: 'd812681c-bc97-457b-b3df-754cc4a42a17',
      instructionNumber: 12,
      articleId: '9a5b4f42-c11e-4cc8-9f7a-705382f98d7c',
      name: 'Produkt Alpha',
      startDate: new Date('2026-08-15T00:00:00.000Z'),
      completionDate: new Date('2026-08-20T00:00:00.000Z'),
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

    await service.create(instruction.id);

    expect(prisma.production.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        productionInstructionId: instruction.id,
        instructionNumber: 12,
        articleId: instruction.articleId,
        name: 'Produkt Alpha',
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

    await expect(service.create('d812681c-bc97-457b-b3df-754cc4a42a17')).rejects.toBeInstanceOf(BadRequestException);
    expect(prisma.production.create).not.toHaveBeenCalled();
  });
});
