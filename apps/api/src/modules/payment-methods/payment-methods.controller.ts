import { Body, Controller, Delete, Get, HttpCode, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiNoContentResponse, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../core/auth/roles.decorator';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { PaymentMethodsService } from './payment-methods.service';

@ApiTags('Zahlungsarten')
@ApiBearerAuth()
@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethods: PaymentMethodsService) {}

  @Get()
  list() {
    return this.paymentMethods.list();
  }

  @Roles('cms-erp-admin')
  @Post()
  @ApiCreatedResponse()
  create(@Body() input: CreatePaymentMethodDto) {
    return this.paymentMethods.create(input.name);
  }

  @Roles('cms-erp-admin')
  @Delete(':id')
  @HttpCode(204)
  @ApiNoContentResponse()
  remove(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.paymentMethods.remove(id);
  }
}
