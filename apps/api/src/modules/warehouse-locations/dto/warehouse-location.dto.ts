import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumberString, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class WarehouseLocationDto {
  @ApiProperty({ example: 'Hauptlager' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  location!: string;

  @ApiProperty({ example: 'A-01' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  shelf!: string;

  @ApiProperty({ example: '03' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  position!: string;

  @ApiPropertyOptional({ example: '500.000', description: 'Maximalgewicht in kg' })
  @IsOptional()
  @IsNumberString()
  maxWeight?: string;

  @ApiPropertyOptional({ example: '120.000', description: 'Länge in cm' })
  @IsOptional()
  @IsNumberString()
  length?: string;

  @ApiPropertyOptional({ example: '80.000', description: 'Breite in cm' })
  @IsOptional()
  @IsNumberString()
  width?: string;

  @ApiPropertyOptional({ example: '60.000', description: 'Tiefe in cm' })
  @IsOptional()
  @IsNumberString()
  depth?: string;
}
