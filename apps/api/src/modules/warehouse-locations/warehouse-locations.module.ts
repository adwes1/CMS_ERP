import { Module } from '@nestjs/common';
import { WarehouseLocationsController } from './warehouse-locations.controller';
import { WarehouseLocationsService } from './warehouse-locations.service';

@Module({
  controllers: [WarehouseLocationsController],
  providers: [WarehouseLocationsService],
})
export class WarehouseLocationsModule {}
