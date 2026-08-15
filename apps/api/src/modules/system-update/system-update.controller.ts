import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../core/auth/roles.decorator';
import { SystemUpdateService } from './system-update.service';

@ApiTags('Systemaktualisierung')
@ApiBearerAuth()
@Roles('cms-erp-admin')
@Controller('system-update')
export class SystemUpdateController {
  constructor(private readonly systemUpdate: SystemUpdateService) {}

  @Get('status')
  status() {
    return this.systemUpdate.status();
  }
}
