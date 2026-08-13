import { Module } from '@nestjs/common';
import { ExternalIntegrationsController } from './external-integrations.controller';
import { ExternalIntegrationsService } from './external-integrations.service';

@Module({ controllers: [ExternalIntegrationsController], providers: [ExternalIntegrationsService] })
export class ExternalIntegrationsModule {}
