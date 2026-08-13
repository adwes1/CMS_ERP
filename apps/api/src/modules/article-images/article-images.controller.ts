import { Body, Controller, Get, Header, Param, Post, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Public } from '../../core/auth/public.decorator';
import { ArticleImagesService } from './article-images.service';
import { UploadArticleImageDto } from './dto/upload-article-image.dto';

@ApiTags('Artikelbilder')
@Controller('article-images')
export class ArticleImagesController {
  constructor(private readonly images: ArticleImagesService) {}

  @Post()
  @ApiBearerAuth()
  @ApiCreatedResponse()
  upload(@Body() input: UploadArticleImageDto) {
    return this.images.store(input.dataUrl);
  }

  @Public()
  @Get(':filename')
  @Header('Cache-Control', 'public, max-age=31536000, immutable')
  async show(@Param('filename') filename: string, @Res({ passthrough: true }) response: Response) {
    const image = await this.images.open(filename);
    response.contentType(image.contentType);
    return new StreamableFile(image.stream);
  }
}
