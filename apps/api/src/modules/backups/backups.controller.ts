import { Controller, Delete, Get, Header, HttpCode, Param, Post, Res, StreamableFile } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { Roles } from '../../core/auth/roles.decorator';
import { BackupsService } from './backups.service';

@ApiTags('Backups')
@ApiBearerAuth()
@Roles('cms-erp-admin')
@Controller('backups')
export class BackupsController {
  constructor(private readonly backups: BackupsService) {}

  @Get()
  list() {
    return this.backups.list();
  }

  @Post()
  @ApiCreatedResponse()
  create() {
    return this.backups.create();
  }

  @Get(':id/download')
  @Header('Cache-Control', 'no-store')
  async download(@Param('id') id: string, @Res({ passthrough: true }) response: Response) {
    const backup = await this.backups.open(id);
    response.setHeader('Content-Type', 'application/zip');
    response.setHeader('Content-Disposition', `attachment; filename="${backup.filename}"`);
    response.setHeader('Content-Length', String(backup.size));
    return new StreamableFile(backup.stream);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@Param('id') id: string) {
    return this.backups.restore(id);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  async remove(@Param('id') id: string) {
    await this.backups.remove(id);
  }
}
