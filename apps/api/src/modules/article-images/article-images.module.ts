import { Module } from '@nestjs/common';
import { ArticleImagesController } from './article-images.controller';
import { ArticleImagesService } from './article-images.service';

@Module({ controllers: [ArticleImagesController], providers: [ArticleImagesService] })
export class ArticleImagesModule {}
