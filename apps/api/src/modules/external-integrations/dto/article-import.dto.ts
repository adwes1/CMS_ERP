import { ApiProperty } from '@nestjs/swagger';
import { Equals } from 'class-validator';

export class StartArticleImportDto {
  @ApiProperty({ example: true, description: 'Bestätigung, dass die Vorschau geprüft wurde.' })
  @Equals(true)
  previewConfirmed!: true;
}
