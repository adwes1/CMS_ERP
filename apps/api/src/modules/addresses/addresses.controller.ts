import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { ListAddressesQueryDto } from './dto/list-addresses-query.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Adressen')
@ApiBearerAuth()
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addresses: AddressesService) {}

  @Get()
  list(@Query() query: ListAddressesQueryDto) {
    return this.addresses.list(query);
  }

  @Post()
  @ApiCreatedResponse()
  create(@Body() input: CreateAddressDto) {
    return this.addresses.create(input);
  }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: UpdateAddressDto) {
    return this.addresses.update(id, input);
  }
}
