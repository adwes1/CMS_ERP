import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../core/auth/roles.decorator';
import { CreateSpecificationDto } from './dto/create-specification.dto';
import { SpecificationsService } from './specifications.service';

@ApiTags('Spezifikationen')
@ApiBearerAuth()
@Controller('specifications')
export class SpecificationsController {
  constructor(private readonly specifications: SpecificationsService) {}

  @Get()
  list() {
    return this.specifications.list();
  }

  @Roles('cms-erp-admin')
  @Post()
  @ApiCreatedResponse()
  create(@Body() input: CreateSpecificationDto) {
    return this.specifications.create(input.name);
  }

  @Roles('cms-erp-admin')
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.specifications.remove(id);
  }
}
