import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsBoolean,
  IsArray,
  IsIn,
  IsNumberString,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateArticleDto {
  @ApiPropertyOptional({ example: 'ART-000001' })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  articleNumber?: string;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  useAutomaticArticleNumber?: boolean;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  name!: string;

  @ApiProperty({ enum: ['VERKAUFSARTIKEL', 'PRODUKTIONSARTIKEL', 'PRODUKTIONSMATERIAL', 'STUECKLISTENARTIKEL', 'DIGITAL_DOWNLOAD', 'RABATT_GUTSCHEIN', 'VERSANDGEBUEHREN'] })
  @IsIn(['VERKAUFSARTIKEL', 'PRODUKTIONSARTIKEL', 'PRODUKTIONSMATERIAL', 'STUECKLISTENARTIKEL', 'DIGITAL_DOWNLOAD', 'RABATT_GUTSCHEIN', 'VERSANDGEBUEHREN'])
  type!: 'VERKAUFSARTIKEL' | 'PRODUKTIONSARTIKEL' | 'PRODUKTIONSMATERIAL' | 'STUECKLISTENARTIKEL' | 'DIGITAL_DOWNLOAD' | 'RABATT_GUTSCHEIN' | 'VERSANDGEBUEHREN';

  @ApiPropertyOptional({ example: '12.500' })
  @IsOptional()
  @IsNumberString()
  stock?: string;

  @ApiPropertyOptional({ description: 'Optional; ohne Angabe wird die Standardeinheit Stück verwendet' })
  @IsOptional()
  @IsUUID()
  unitId?: string;
  @ApiPropertyOptional({ example: '19' }) @IsOptional() @IsString() @MaxLength(30) vatRate?: string;

  @ApiPropertyOptional({ example: '1.250', description: 'Nettogewicht ohne Verpackung in kg' })
  @IsOptional() @ValidateIf((_object, value) => value !== '') @IsNumberString()
  netWeightKg?: string;

  @ApiPropertyOptional({ example: '1.500', description: 'Bruttogewicht mit Verpackung in kg' })
  @IsOptional() @ValidateIf((_object, value) => value !== '') @IsNumberString()
  grossWeightKg?: string;

  @ApiPropertyOptional({ example: '40.000', description: 'Länge in cm' })
  @IsOptional() @ValidateIf((_object, value) => value !== '') @IsNumberString()
  lengthCm?: string;

  @ApiPropertyOptional({ example: '30.000', description: 'Breite in cm' })
  @IsOptional() @ValidateIf((_object, value) => value !== '') @IsNumberString()
  widthCm?: string;

  @ApiPropertyOptional({ example: '20.000', description: 'Höhe in cm' })
  @IsOptional() @ValidateIf((_object, value) => value !== '') @IsNumberString()
  heightCm?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) notes?: string;

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsObject({ each: true })
  purchasePrices?: Record<string, string>[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsObject({ each: true })
  salePrices?: Record<string, string>[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsObject({ each: true })
  stockEntries?: Record<string, string>[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsObject({ each: true })
  positions?: Record<string, string>[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsObject({ each: true })
  externalNumbers?: Record<string, string>[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @IsObject({ each: true })
  files?: Record<string, string>[];

  @ApiPropertyOptional()
  @IsOptional() @IsObject()
  purchasing?: Record<string, string>;

  @ApiPropertyOptional({ type: [String], format: 'uuid' })
  @IsOptional() @IsArray() @ArrayMaxSize(500) @ArrayUnique() @IsUUID('4', { each: true })
  variantIds?: string[];
}
