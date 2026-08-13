import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../core/auth/roles.decorator';
import { WarehouseLocationDto } from './dto/warehouse-location.dto';
import { WarehouseLocationsService } from './warehouse-locations.service';

@ApiTags('Lagerplätze')
@ApiBearerAuth()
@Controller('warehouse-locations')
export class WarehouseLocationsController {
  constructor(private readonly warehouseLocations: WarehouseLocationsService) {}

  @Get()
  list() { return this.warehouseLocations.list(); }

  @Post()
  @Roles('cms-erp-admin')
  @ApiCreatedResponse()
  create(@Body() input: WarehouseLocationDto) { return this.warehouseLocations.create(input); }

  @Patch(':id')
  @Roles('cms-erp-admin')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: WarehouseLocationDto) {
    return this.warehouseLocations.update(id, input);
  }

  @Delete(':id')
  @Roles('cms-erp-admin')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.warehouseLocations.remove(id); }
}
