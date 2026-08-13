import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../core/auth/roles.decorator';
import { CreateExternalIntegrationDto, UpdateExternalIntegrationDto, UpdateIntegrationCronSettingsDto, UpdateIntegrationDataPermissionsDto } from './dto/external-integration.dto';
import { ExternalIntegrationsService } from './external-integrations.service';
import { StartCustomerImportDto } from './dto/customer-import.dto';
import { StartArticleImportDto } from './dto/article-import.dto';

@ApiTags('Externe Schnittstellen')
@ApiBearerAuth()
@Roles('cms-erp-admin')
@Controller('external-integrations')
export class ExternalIntegrationsController {
  constructor(private readonly integrations: ExternalIntegrationsService) {}

  @Get()
  list() { return this.integrations.list(); }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.integrations.get(id); }

  @Post()
  @ApiCreatedResponse()
  create(@Body() input: CreateExternalIntegrationDto) { return this.integrations.create(input); }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateExternalIntegrationDto) {
    return this.integrations.update(id, input);
  }

  @Patch(':id/data-permissions')
  updateDataPermissions(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateIntegrationDataPermissionsDto,
  ) {
    return this.integrations.updateDataPermissions(id, input);
  }

  @Patch(':id/cron-settings')
  updateCronSettings(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateIntegrationCronSettingsDto,
  ) {
    return this.integrations.updateCronSettings(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.integrations.remove(id); }

  @Post(':id/test')
  test(@Param('id', new ParseUUIDPipe()) id: string) { return this.integrations.test(id); }

  @Post(':id/customer-import/preview')
  previewCustomerImport(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.integrations.previewCustomerImport(id);
  }

  @Get(':id/customer-import/latest')
  latestCustomerImport(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.integrations.latestCustomerImport(id);
  }

  @Post(':id/customer-import/start')
  startCustomerImport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() _input: StartCustomerImportDto,
  ) {
    return this.integrations.startCustomerImport(id);
  }

  @Post(':id/customer-import/:jobId/next')
  processNextCustomerImportBatch(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.integrations.processNextCustomerImportBatch(id, jobId);
  }

  @Post(':id/article-import/preview')
  previewArticleImport(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.integrations.previewArticleImport(id);
  }

  @Get(':id/article-import/latest')
  latestArticleImport(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.integrations.latestArticleImport(id);
  }

  @Post(':id/article-import/start')
  startArticleImport(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() _input: StartArticleImportDto,
  ) {
    return this.integrations.startArticleImport(id);
  }

  @Post(':id/article-import/:jobId/next')
  processNextArticleImportBatch(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Param('jobId', new ParseUUIDPipe()) jobId: string,
  ) {
    return this.integrations.processNextArticleImportBatch(id, jobId);
  }
}
