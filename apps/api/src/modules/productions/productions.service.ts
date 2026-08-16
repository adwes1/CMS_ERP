import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { CreateProductionDto } from './dto/create-production.dto';

const includeProduction = {
  article: { select: { id: true, articleNumber: true, name: true } },
  productionInstruction: { select: { id: true, instructionNumber: true, name: true, updatedAt: true } },
  elements: {
    orderBy: { position: 'asc' as const },
    include: { steps: { orderBy: { position: 'asc' as const } } },
  },
};

const selectProductionSummary = {
  id: true,
  productionNumber: true,
  productionInstructionId: true,
  productionInstruction: includeProduction.productionInstruction,
  instructionNumber: true,
  articleId: true,
  article: includeProduction.article,
  name: true,
  startDate: true,
  completionDate: true,
  plannedDays: true,
  status: true,
  elements: {
    orderBy: { position: 'asc' as const },
    select: {
      id: true,
      position: true,
      name: true,
      steps: {
        orderBy: { position: 'asc' as const },
        select: { id: true, position: true, name: true, status: true },
      },
    },
  },
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class ProductionsService {
  constructor(private readonly prisma: PrismaService) {}

  list() {
    return this.prisma.production.findMany({
      select: selectProductionSummary,
      orderBy: { productionNumber: 'desc' },
    });
  }

  async get(id: string) {
    const production = await this.prisma.production.findUnique({ where: { id }, include: includeProduction });
    if (!production) throw new NotFoundException('Produktion wurde nicht gefunden');
    return production;
  }

  private date(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private plannedDays(startDate: Date, completionDate: Date) {
    return Math.floor((completionDate.getTime() - startDate.getTime()) / 86_400_000) + 1;
  }

  async create(input: CreateProductionDto) {
    const startDate = this.date(input.startDate);
    const completionDate = this.date(input.completionDate);
    if (completionDate < startDate) {
      throw new BadRequestException('Das Produktionsende darf nicht vor dem Produktionsstart liegen');
    }

    const instruction = await this.prisma.productionInstruction.findUnique({
      where: { id: input.productionInstructionId },
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
        startDate,
        completionDate,
        plannedDays: this.plannedDays(startDate, completionDate),
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
