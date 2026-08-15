import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsDateString,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';

export class ProductionInstructionStepDto {
  @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @IsIn(['PHYSICAL_WORK', 'PROCESS'])
  workType!: 'PHYSICAL_WORK' | 'PROCESS';

  @IsBoolean()
  controlActive!: boolean;

  @IsOptional() @IsString() @MaxLength(5_000)
  employeeInstruction?: string;

  @IsBoolean()
  employeeInstructionActive!: boolean;

  @IsBoolean()
  confirmationRequired!: boolean;

  @IsInt() @Min(0) @Max(999)
  plannedHours!: number;

  @IsInt() @Min(0) @Max(59)
  plannedMinutes!: number;

  @IsBoolean()
  timeEstimateActive!: boolean;

  @IsInt() @Min(0) @Max(999)
  timerHours!: number;

  @IsInt() @Min(0) @Max(59)
  timerMinutes!: number;

  @IsBoolean()
  timerActive!: boolean;

  @IsIn(['NONE', 'GENERATOR', 'INPUT'])
  serialNumberMode!: 'NONE' | 'GENERATOR' | 'INPUT';

  @IsBoolean()
  serialNumberActive!: boolean;
}

export class ProductionInstructionElementDto {
  @IsString() @MinLength(1) @MaxLength(200)
  name!: string;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(200)
  @ValidateNested({ each: true }) @Type(() => ProductionInstructionStepDto)
  steps!: ProductionInstructionStepDto[];
}

export class SaveProductionInstructionDto {
  @IsUUID()
  articleId!: string;

  @IsDateString({ strict: true })
  startDate!: string;

  @IsDateString({ strict: true })
  completionDate!: string;

  @IsInt() @Min(1) @Max(100)
  partCount!: number;

  @IsArray() @ArrayMinSize(1) @ArrayMaxSize(100)
  @ValidateNested({ each: true }) @Type(() => ProductionInstructionElementDto)
  elements!: ProductionInstructionElementDto[];
}
