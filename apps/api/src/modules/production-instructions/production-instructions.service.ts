import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../core/database/prisma.service';
import { SaveProductionInstructionDto } from './dto/production-instruction.dto';

const includeInstruction = {
  article: { select: { id: true, articleNumber: true, name: true, type: true } },
  elements: {
    orderBy: { position: 'asc' as const },
    include: { steps: { orderBy: { position: 'asc' as const } } },
  },
};

const MAX_TOTAL_STEPS = 1_000;

@Injectable()
export class ProductionInstructionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const instructions = await this.prisma.productionInstruction.findMany({
      include: {
        article: includeInstruction.article,
        elements: { select: { _count: { select: { steps: true } } } },
      },
      orderBy: { instructionNumber: 'desc' },
    });

    return instructions.map(({ elements, ...instruction }) => ({
      ...instruction,
      elementCount: elements.length,
      stepCount: elements.reduce((sum, element) => sum + element._count.steps, 0),
    }));
  }

  async get(id: string) {
    const instruction = await this.prisma.productionInstruction.findUnique({
      where: { id },
      include: includeInstruction,
    });
    if (!instruction) throw new NotFoundException('Produktionsanweisung wurde nicht gefunden');
    return instruction;
  }

  private date(value: string) {
    return new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  }

  private async validate(input: SaveProductionInstructionDto) {
    if (input.elements.length !== input.partCount) {
      throw new BadRequestException('Die Anzahl der Produktelemente stimmt nicht mit der Teileanzahl überein');
    }
    if (this.date(input.completionDate) < this.date(input.startDate)) {
      throw new BadRequestException('Das Abschlussdatum darf nicht vor dem Startdatum liegen');
    }
    if (input.elements.some((element) => !element.name.trim())) {
      throw new BadRequestException('Jedes Produktelement benötigt einen Namen');
    }
    if (input.elements.some((element) => element.steps.some((step) => !step.name.trim()))) {
      throw new BadRequestException('Jeder Produktionsschritt benötigt eine Bezeichnung');
    }
    const totalSteps = input.elements.reduce((sum, element) => sum + element.steps.length, 0);
    if (totalSteps > MAX_TOTAL_STEPS) {
      throw new BadRequestException(`Eine Produktionsanweisung darf höchstens ${MAX_TOTAL_STEPS} Schritte enthalten`);
    }

    const article = await this.prisma.article.findUnique({
      where: { id: input.articleId },
      select: { id: true, name: true, type: true },
    });
    if (!article) throw new BadRequestException('Der gewählte Artikel wurde nicht gefunden');
    if (!['PRODUKTIONSARTIKEL', 'STUECKLISTENARTIKEL'].includes(article.type)) {
      throw new BadRequestException('Produktionsanweisungen können nur für Produktions- oder Stücklistenartikel angelegt werden');
    }
    return article;
  }

  private elementsData(input: SaveProductionInstructionDto) {
    return input.elements.map((element, elementIndex) => ({
      position: elementIndex + 1,
      name: element.name.trim(),
      steps: {
        create: element.steps.map((step, stepIndex) => ({
          position: stepIndex + 1,
          name: step.name.trim(),
          workType: step.workType,
          controlActive: step.controlActive,
          employeeInstruction: step.employeeInstruction?.trim() || null,
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
        })),
      },
    }));
  }

  async create(input: SaveProductionInstructionDto) {
    const article = await this.validate(input);
    return this.prisma.productionInstruction.create({
      data: {
        articleId: article.id,
        name: article.name,
        startDate: this.date(input.startDate),
        completionDate: this.date(input.completionDate),
        partCount: input.partCount,
        elements: { create: this.elementsData(input) },
      },
      include: includeInstruction,
    });
  }

  async update(id: string, input: SaveProductionInstructionDto) {
    const existing = await this.prisma.productionInstruction.findUnique({ where: { id }, select: { id: true } });
    if (!existing) throw new NotFoundException('Produktionsanweisung wurde nicht gefunden');
    const article = await this.validate(input);

    return this.prisma.$transaction(async (transaction) => {
      await transaction.productionInstructionElement.deleteMany({ where: { productionInstructionId: id } });
      return transaction.productionInstruction.update({
        where: { id },
        data: {
          articleId: article.id,
          name: article.name,
          startDate: this.date(input.startDate),
          completionDate: this.date(input.completionDate),
          partCount: input.partCount,
          elements: { create: this.elementsData(input) },
        },
        include: includeInstruction,
      });
    });
  }

  async remove(id: string) {
    try {
      await this.prisma.productionInstruction.delete({ where: { id } });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
        throw new BadRequestException('Die Produktionsanweisung wird bereits von einer Produktion verwendet und kann nicht gelöscht werden');
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw new NotFoundException('Produktionsanweisung wurde nicht gefunden');
      }
      throw error;
    }
  }
}
