import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayMaxSize,
  IsArray,
  IsEmail,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  ValidateIf,
} from 'class-validator';

export class CreateAddressDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(64)
  customerNumber?: string;

  @ApiPropertyOptional({ enum: ['KUNDE', 'LIEFERANT', 'BEIDES'], default: 'KUNDE' })
  @IsOptional()
  @IsIn(['KUNDE', 'LIEFERANT', 'BEIDES'])
  type?: 'KUNDE' | 'LIEFERANT' | 'BEIDES';

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) company?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) salutation?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) firstName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) lastName?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(200) street?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) houseNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(20) postalCode?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) city?: string;
  @ApiPropertyOptional({ default: 'Deutschland' }) @IsOptional() @IsString() @MaxLength(100) country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) phone?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(50) mobile?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(2_048) website?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(100) taxNumber?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(10_000) notes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsUUID()
  specificationId?: string;

  @ApiPropertyOptional() @IsOptional() @IsObject() bankData?: Record<string, string>;

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  deliveryAddresses?: Record<string, string>[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  contacts?: Record<string, string>[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(100)
  @IsObject({ each: true })
  documents?: Record<string, string>[];

  @ApiPropertyOptional({ type: 'array' })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(500)
  @IsObject({ each: true })
  purchasedItems?: Record<string, string>[];
}
