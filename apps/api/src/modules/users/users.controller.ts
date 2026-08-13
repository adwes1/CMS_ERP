import { Body, Controller, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post, Put } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../core/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../core/auth/auth.types';
import { Roles } from '../../core/auth/roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { KeycloakAdminService } from './keycloak-admin.service';
import { UsersService } from './users.service';

@ApiTags('Benutzer')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(
    private readonly users: UsersService,
    private readonly keycloak: KeycloakAdminService,
  ) {}

  @Get('me')
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.getOrCreateProfile(user);
  }

  @Roles('cms-erp-admin')
  @Get()
  list() {
    return this.keycloak.listUsers();
  }

  @Roles('cms-erp-admin')
  @Post()
  @ApiCreatedResponse()
  async create(@Body() input: CreateUserDto) {
    await this.keycloak.createUser(input);
    return { created: true };
  }

  @Roles('cms-erp-admin')
  @Patch(':id')
  async update(
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() input: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    await this.keycloak.updateUser(id, input, actor.sub);
    return { updated: true };
  }

  @Roles('cms-erp-admin')
  @Put(':id/password')
  @HttpCode(204)
  @ApiNoContentResponse()
  async resetPassword(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: ResetPasswordDto) {
    await this.keycloak.resetPassword(id, input.password);
  }
}
