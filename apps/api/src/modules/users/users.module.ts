import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { KeycloakAdminService } from './keycloak-admin.service';

@Module({
  controllers: [UsersController],
  providers: [UsersService, KeycloakAdminService],
  exports: [UsersService],
})
export class UsersModule {}
