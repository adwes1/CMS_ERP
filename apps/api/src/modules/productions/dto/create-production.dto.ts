import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreateProductionDto {
  @ApiProperty({ format: 'uuid', description: 'Verbindliche Produktionsanweisung für diese Produktion' })
  @IsUUID()
  productionInstructionId!: string;
}
