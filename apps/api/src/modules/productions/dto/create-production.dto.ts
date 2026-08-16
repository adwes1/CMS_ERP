import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsUUID, Matches } from 'class-validator';

export class CreateProductionDto {
  @ApiProperty({ format: 'uuid', description: 'Verbindliche Produktionsanweisung für diese Produktion' })
  @IsUUID()
  productionInstructionId!: string;

  @ApiProperty({ format: 'date', example: '2026-08-15' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  startDate!: string;

  @ApiProperty({ format: 'date', example: '2026-08-20' })
  @IsDateString({ strict: true })
  @Matches(/^\d{4}-\d{2}-\d{2}$/)
  completionDate!: string;
}
