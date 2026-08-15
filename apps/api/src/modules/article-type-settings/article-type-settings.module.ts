import { Module } from '@nestjs/common';
import { ArticleTypeSettingsController } from './article-type-settings.controller';
import { ArticleTypeSettingsService } from './article-type-settings.service';

@Module({ controllers: [ArticleTypeSettingsController], providers: [ArticleTypeSettingsService] })
export class ArticleTypeSettingsModule {}
