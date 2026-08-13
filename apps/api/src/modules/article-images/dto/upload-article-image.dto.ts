import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class UploadArticleImageDto {
  @ApiProperty({ example: 'produkt.jpg' })
  @IsString()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Bild als Data-URL; wird ausschließlich beim Upload übertragen' })
  @IsString()
  @MaxLength(2_800_000)
  dataUrl!: string;
}
