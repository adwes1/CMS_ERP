import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { ArticlesService } from './articles.service';
import { CreateArticleDto } from './dto/create-article.dto';
import { UpdateArticleDto } from './dto/update-article.dto';

@ApiTags('Artikel')
@ApiBearerAuth()
@Controller('articles')
export class ArticlesController {
  constructor(private readonly articles: ArticlesService) {}

  @Get() list() { return this.articles.list(); }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.articles.get(id); }

  @Post()
  @ApiCreatedResponse()
  create(@Body() input: CreateArticleDto) { return this.articles.create(input); }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateArticleDto) {
    return this.articles.update(id, input);
  }
}
