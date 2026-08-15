import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

export class UpdateArticleTypeSettingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(100)
  label!: string;

  @ApiProperty({ example: 'EK-' })
  @IsString()
  @MaxLength(20)
  prefix!: string;

  @ApiProperty({ example: '#F5E642' })
  @IsString()
  @Matches(/^#[0-9A-Fa-f]{6}$/, { message: 'Die Textfarbe muss ein sechsstelliger Hex-Farbwert sein' })
  textColor!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  @Max(2_000_000_000)
  nextNumber!: number;
}
