import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { SaveProductionInstructionDto } from './dto/production-instruction.dto';
import { ProductionInstructionsService } from './production-instructions.service';

@ApiTags('Produktionsanweisungen')
@ApiBearerAuth()
@Controller('production-instructions')
export class ProductionInstructionsController {
  constructor(private readonly productionInstructions: ProductionInstructionsService) {}

  @Get()
  list() { return this.productionInstructions.list(); }

  @Get(':id')
  get(@Param('id', new ParseUUIDPipe()) id: string) { return this.productionInstructions.get(id); }

  @Post()
  @ApiCreatedResponse()
  create(@Body() input: SaveProductionInstructionDto) { return this.productionInstructions.create(input); }

  @Patch(':id')
  update(@Param('id', new ParseUUIDPipe()) id: string, @Body() input: SaveProductionInstructionDto) {
    return this.productionInstructions.update(id, input);
  }

  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id', new ParseUUIDPipe()) id: string) { return this.productionInstructions.remove(id); }
}
