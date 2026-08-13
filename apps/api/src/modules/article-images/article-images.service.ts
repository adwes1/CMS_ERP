import { BadRequestException, Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { access, mkdir, writeFile } from 'node:fs/promises';
import { basename, join } from 'node:path';
import { PrismaService } from '../../core/database/prisma.service';

const IMAGE_TYPES: Record<string, { extension: string; contentType: string }> = {
  'image/jpeg': { extension: '.jpg', contentType: 'image/jpeg' },
  'image/png': { extension: '.png', contentType: 'image/png' },
  'image/webp': { extension: '.webp', contentType: 'image/webp' },
  'image/gif': { extension: '.gif', contentType: 'image/gif' },
};

@Injectable()
export class ArticleImagesService implements OnModuleInit {
  private readonly logger = new Logger(ArticleImagesService.name);
  private readonly directory = process.env.ARTICLE_IMAGE_DIR || join(process.cwd(), 'data', 'article-images');

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await mkdir(this.directory, { recursive: true });
    await this.migrateEmbeddedImages();
  }

  private parseDataUrl(dataUrl: string) {
    const match = /^data:(image\/(?:jpeg|png|webp|gif));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl);
    if (!match) throw new BadRequestException('Nur JPEG-, PNG-, WebP- oder GIF-Bilder sind erlaubt');
    const type = IMAGE_TYPES[match[1]];
    const buffer = Buffer.from(match[2], 'base64');
    if (!buffer.length || buffer.length > 2 * 1024 * 1024) {
      throw new BadRequestException('Das Produktbild darf maximal 2 MB groß sein');
    }
    return { buffer, ...type };
  }

  async store(dataUrl: string) {
    const image = this.parseDataUrl(dataUrl);
    const filename = `${randomUUID()}${image.extension}`;
    await writeFile(join(this.directory, filename), image.buffer, { flag: 'wx' });
    return { reference: `/api/article-images/${filename}`, mimeType: image.contentType };
  }

  async open(filename: string) {
    const safeFilename = basename(filename);
    if (safeFilename !== filename || !/^[0-9a-f-]+\.(?:jpg|png|webp|gif)$/.test(filename)) {
      throw new NotFoundException('Produktbild wurde nicht gefunden');
    }
    const path = join(this.directory, safeFilename);
    try {
      await access(path);
    } catch {
      throw new NotFoundException('Produktbild wurde nicht gefunden');
    }
    const extension = safeFilename.slice(safeFilename.lastIndexOf('.'));
    const contentType = Object.values(IMAGE_TYPES).find((type) => type.extension === extension)?.contentType ?? 'application/octet-stream';
    return { stream: createReadStream(path), contentType };
  }

  private async migrateEmbeddedImages() {
    const articles = await this.prisma.article.findMany({ select: { id: true, files: true } });
    let migrated = 0;
    for (const article of articles) {
      if (!Array.isArray(article.files)) continue;
      let changed = false;
      const files: Prisma.JsonObject[] = [];
      for (const rawFile of article.files) {
        if (typeof rawFile !== 'object' || rawFile === null || Array.isArray(rawFile)) continue;
        const file = { ...rawFile } as Prisma.JsonObject;
        if (file.category === 'Produktabbildung' && typeof file.dataUrl === 'string') {
          try {
            const stored = await this.store(file.dataUrl);
            delete file.dataUrl;
            file.reference = stored.reference;
            file.mimeType = stored.mimeType;
            changed = true;
            migrated += 1;
          } catch (error) {
            this.logger.error(`Produktbild von Artikel ${article.id} konnte nicht migriert werden`, error);
          }
        }
        files.push(file);
      }
      if (changed) {
        await this.prisma.article.update({ where: { id: article.id }, data: { files: files as Prisma.InputJsonValue } });
      }
    }
    if (migrated) this.logger.log(`${migrated} Produktbilder in den Dateispeicher migriert`);
  }
}
