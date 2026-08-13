import { Module } from '@nestjs/common';
import { ArticleUnitsController } from './article-units.controller';
import { ArticleUnitsService } from './article-units.service';

@Module({ controllers: [ArticleUnitsController], providers: [ArticleUnitsService] })
export class ArticleUnitsModule {}
