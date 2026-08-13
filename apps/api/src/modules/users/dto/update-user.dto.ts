import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsEmail, IsOptional, IsString, MaxLength, MinLength, ValidateIf } from 'class-validator';

export class UpdateUserDto {
  @ApiProperty({ example: 'max.mustermann' })
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  username!: string;

  @ApiPropertyOptional({ example: 'max@example.com' })
  @IsOptional()
  @ValidateIf((_object, value) => value !== '')
  @IsEmail()
  @MaxLength(254)
  email?: string;

  @ApiProperty()
  @IsBoolean()
  enabled!: boolean;

  @ApiProperty()
  @IsBoolean()
  isAdmin!: boolean;
}
