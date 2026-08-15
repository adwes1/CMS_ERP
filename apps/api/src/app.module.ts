import { Module } from '@nestjs/common';
import { AuthModule } from './core/auth/auth.module';
import { DatabaseModule } from './core/database/database.module';
import { HealthModule } from './modules/health/health.module';
import { UsersModule } from './modules/users/users.module';
import { AddressesModule } from './modules/addresses/addresses.module';
import { SpecificationsModule } from './modules/specifications/specifications.module';
import { ArticlesModule } from './modules/articles/articles.module';
import { ArticleUnitsModule } from './modules/article-units/article-units.module';
import { WarehouseLocationsModule } from './modules/warehouse-locations/warehouse-locations.module';
import { ExternalIntegrationsModule } from './modules/external-integrations/external-integrations.module';
import { ArticleImagesModule } from './modules/article-images/article-images.module';
import { PaymentMethodsModule } from './modules/payment-methods/payment-methods.module';
import { ProductionInstructionsModule } from './modules/production-instructions/production-instructions.module';
import { ProductionsModule } from './modules/productions/productions.module';
import { ArticleTypeSettingsModule } from './modules/article-type-settings/article-type-settings.module';
import { BackupsModule } from './modules/backups/backups.module';
import { SystemUpdateModule } from './modules/system-update/system-update.module';

@Module({
  imports: [DatabaseModule, AuthModule, HealthModule, UsersModule, AddressesModule, SpecificationsModule, ArticlesModule, ArticleUnitsModule, ArticleTypeSettingsModule, WarehouseLocationsModule, ExternalIntegrationsModule, ArticleImagesModule, PaymentMethodsModule, ProductionInstructionsModule, ProductionsModule, BackupsModule, SystemUpdateModule],
})
export class AppModule {}
