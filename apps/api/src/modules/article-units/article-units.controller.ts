import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../core/auth/roles.decorator';
import { ArticleUnitsService } from './article-units.service';
import { CreateArticleUnitDto } from './dto/create-article-unit.dto';
import { UpdateArticleUnitDto } from './dto/update-article-unit.dto';

@ApiTags('Artikel-Einheiten')
@ApiBearerAuth()
@Controller('article-units')
export class ArticleUnitsController {
  constructor(private readonly units: ArticleUnitsService) {}

  @Get() list() { return this.units.list(); }

  @Roles('cms-erp-admin')
  @Post()
  @ApiCreatedResponse()
  create(@Body() input: CreateArticleUnitDto) { return this.units.create(input.name); }

  @Roles('cms-erp-admin')
  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateArticleUnitDto) {
    return this.units.update(id, input.name);
  }

  @Roles('cms-erp-admin')
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.units.remove(id); }
}
