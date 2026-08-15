import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../core/database/prisma.service';
import { UpdateArticleTypeSettingDto } from './dto/update-article-type-setting.dto';

@Injectable()
export class ArticleTypeSettingsService {
  constructor(private readonly prisma: PrismaService) {}

  private withPreview(setting: { type: string; label: string; prefix: string; textColor: string; nextNumber: number; padding: number; createdAt: Date; updatedAt: Date }) {
    return {
      ...setting,
      nextArticleNumber: `${setting.prefix}${String(setting.nextNumber).padStart(setting.padding, '0')}`,
    };
  }

  async list() {
    const settings = await this.prisma.articleTypeSetting.findMany({ orderBy: { createdAt: 'asc' } });
    return settings.map((setting) => this.withPreview(setting));
  }

  async update(type: string, input: UpdateArticleTypeSettingDto) {
    const existing = await this.prisma.articleTypeSetting.findUnique({ where: { type } });
    if (!existing) throw new NotFoundException('Artikeltyp wurde nicht gefunden');
    const label = input.label.trim();
    const prefix = input.prefix.trim();
    if (!label) throw new BadRequestException('Die Bezeichnung ist erforderlich');
    const updated = await this.prisma.articleTypeSetting.update({
      where: { type },
      data: { label, prefix, textColor: input.textColor.toUpperCase(), nextNumber: input.nextNumber },
    });
    return this.withPreview(updated);
  }
}
