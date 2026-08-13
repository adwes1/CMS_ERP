import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsInt, IsOptional, IsString, IsUrl, Max, MaxLength, Min, MinLength } from 'class-validator';

export class CreateExternalIntegrationDto {
  @ApiProperty({ example: 'Shopware Hauptshop' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;

  @ApiProperty({ enum: ['SHOPWARE_6'], example: 'SHOPWARE_6' })
  @IsIn(['SHOPWARE_6'])
  provider!: 'SHOPWARE_6';

  @ApiProperty({ example: 'https://shop.example.com' })
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  baseUrl!: string;

  @ApiProperty({ example: 'SWIA...' })
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  clientId!: string;

  @ApiProperty({ example: 'CREDENTIAL_SECRET' })
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  clientSecret!: string;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateExternalIntegrationDto {
  @ApiPropertyOptional({ example: 'Shopware Hauptshop' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ example: 'https://shop.example.com' })
  @IsOptional()
  @IsUrl({ require_protocol: true, protocols: ['http', 'https'] })
  @MaxLength(500)
  baseUrl?: string;

  @ApiPropertyOptional({ example: 'SWIA...' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  clientId?: string;

  @ApiPropertyOptional({ description: 'Leer lassen, um das vorhandene Geheimnis beizubehalten.' })
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  clientSecret?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateIntegrationDataPermissionsDto {
  @ApiProperty({ default: false, description: 'Daten vom Anbieter in das ERP importieren.' })
  @IsBoolean()
  allowImport!: boolean;

  @ApiProperty({ default: false, description: 'Aktuellen Artikelbestand vom Anbieter in das ERP übernehmen.' })
  @IsBoolean()
  allowStockImport!: boolean;

  @ApiProperty({ default: false, description: 'Daten aus dem ERP zum Anbieter exportieren.' })
  @IsBoolean()
  allowExport!: boolean;

  @ApiProperty({ default: false, description: 'Bestehende Daten beim Anbieter oder im ERP aktualisieren.' })
  @IsBoolean()
  allowUpdate!: boolean;

  @ApiProperty({ default: false, description: 'Daten über die Schnittstelle löschen.' })
  @IsBoolean()
  allowDelete!: boolean;
}

export class UpdateIntegrationCronSettingsDto {
  @ApiProperty({ example: 15, minimum: 1, maximum: 10080, description: 'Abrufintervall in Minuten.' })
  @IsInt()
  @Min(1)
  @Max(10080)
  intervalMinutes!: number;

  @ApiProperty({ default: false })
  @IsBoolean()
  enabled!: boolean;
}
