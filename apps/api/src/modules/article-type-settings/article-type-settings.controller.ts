import { Body, Controller, Get, Param, Patch } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../core/auth/roles.decorator';
import { ArticleTypeSettingsService } from './article-type-settings.service';
import { UpdateArticleTypeSettingDto } from './dto/update-article-type-setting.dto';

@ApiTags('Artikeltypen und Nummernkreise')
@ApiBearerAuth()
@Controller('article-type-settings')
export class ArticleTypeSettingsController {
  constructor(private readonly settings: ArticleTypeSettingsService) {}

  @Get()
  list() { return this.settings.list(); }

  @Roles('cms-erp-admin')
  @Patch(':type')
  update(@Param('type') type: string, @Body() input: UpdateArticleTypeSettingDto) {
    return this.settings.update(type, input);
  }
}
