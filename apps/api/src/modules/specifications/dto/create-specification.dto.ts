import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateSpecificationDto {
  @ApiProperty({ example: 'Shop' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name!: string;
}
