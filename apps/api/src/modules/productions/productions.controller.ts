import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { CreateProductionDto } from './dto/create-production.dto';
import { ProductionsService } from './productions.service';

@ApiTags('Produktionen')
@ApiBearerAuth()
@Controller('productions')
export class ProductionsController {
  constructor(private readonly productions: ProductionsService) {}

  @Get()
  list() { return this.productions.list(); }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.productions.get(id); }

  @Post()
  @ApiCreatedResponse()
  create(@Body() input: CreateProductionDto) {
    return this.productions.create(input);
  }
}
