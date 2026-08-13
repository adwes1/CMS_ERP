import { PartialType } from '@nestjs/swagger';
import { CreateArticleUnitDto } from './create-article-unit.dto';

export class UpdateArticleUnitDto extends PartialType(CreateArticleUnitDto) {}
