import { Module } from '@nestjs/common';
import { ProductionInstructionsController } from './production-instructions.controller';
import { ProductionInstructionsService } from './production-instructions.service';

@Module({
  controllers: [ProductionInstructionsController],
  providers: [ProductionInstructionsService],
})
export class ProductionInstructionsModule {}
