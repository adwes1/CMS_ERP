import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
  @ApiProperty({ example: 'neues-passwort' })
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  password!: string;
}
