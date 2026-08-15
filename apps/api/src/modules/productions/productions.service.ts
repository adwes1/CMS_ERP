import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';

const includeProduction = {
  article: { select: { id: true, articleNumber: true, name: true } },
  productionInstruction: { select: { id: true, instructionNumber: true, name: true, updatedAt: true } },
  elements: {
    orderBy: { position: 'asc' as const },
    include: { steps: { orderBy: { position: 'asc' as const } } },
  },
};

@Injectable()
export class ProductionsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.production.findMany({
      include: includeProduction,
      orderBy: { productionNumber: 'desc' },
    });
  }

  async get(id: string) {
    const production = await this.prisma.production.findUnique({ where: { id }, include: includeProduction });
    if (!production) throw new NotFoundException('Produktion wurde nicht gefunden');
    return production;
  }

  async create(productionInstructionId: string) {
    const instruction = await this.prisma.productionInstruction.findUnique({
      where: { id: productionInstructionId },
      include: {
        elements: {
          orderBy: { position: 'asc' },
          include: { steps: { orderBy: { position: 'asc' } } },
        },
      },
    });
    if (!instruction) throw new BadRequestException('Die gewählte Produktionsanweisung wurde nicht gefunden');
    if (!instruction.elements.length || instruction.elements.some((element) => !element.steps.length)) {
      throw new BadRequestException('Die Produktionsanweisung enthält nicht für jedes Teil mindestens einen Schritt');
    }

    return this.prisma.production.create({
      data: {
        productionInstructionId: instruction.id,
        instructionNumber: instruction.instructionNumber,
        articleId: instruction.articleId,
        name: instruction.name,
        startDate: instruction.startDate,
        completionDate: instruction.completionDate,
        status: 'PLANNED',
        elements: {
          create: instruction.elements.map((element) => ({
            position: element.position,
            name: element.name,
            steps: {
              create: element.steps.map((step) => ({
                position: step.position,
                name: step.name,
                workType: step.workType,
                controlActive: step.controlActive,
                employeeInstruction: step.employeeInstruction,
                employeeInstructionActive: step.employeeInstructionActive,
                confirmationRequired: step.confirmationRequired,
                plannedHours: step.plannedHours,
                plannedMinutes: step.plannedMinutes,
                timeEstimateActive: step.timeEstimateActive,
                timerHours: step.timerHours,
                timerMinutes: step.timerMinutes,
                timerActive: step.timerActive,
                serialNumberMode: step.serialNumberMode,
                serialNumberActive: step.serialNumberActive,
                status: 'NOT_STARTED',
              })),
            },
          })),
        },
      },
      include: includeProduction,
    });
  }
}
