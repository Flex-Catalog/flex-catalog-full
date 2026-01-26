import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { CurrentUser, RequirePermissions, RequireFeatures } from '../common/decorators';
import { AuthUser, CreateInvoiceInput, InvoiceStatus } from '@product-catalog/shared';
import { IsString, IsOptional, IsObject, IsEnum } from 'class-validator';

class CreateInvoiceDto implements CreateInvoiceInput {
  @IsString()
  country: string;

  @IsObject()
  payload: any;
}

@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@RequireFeatures('INVOICES')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'List invoices' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false, enum: ['DRAFT', 'PENDING', 'ISSUED', 'FAILED', 'CANCELED'] })
  async findAll(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
  ) {
    return this.invoicesService.findAll(
      user.tenantId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
      status as InvoiceStatus,
    );
  }

  @Get(':id')
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.findById(id, user.tenantId);
  }

  @Post()
  @RequirePermissions('INVOICE_ISSUE')
  @ApiOperation({ summary: 'Create new invoice' })
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvoiceDto) {
    return this.invoicesService.create(user.tenantId, dto);
  }

  @Post(':id/issue')
  @RequirePermissions('INVOICE_ISSUE')
  @ApiOperation({ summary: 'Issue invoice (generate fiscal document)' })
  async issue(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.issue(id, user.tenantId);
  }

  @Patch(':id/cancel')
  @RequirePermissions('INVOICE_ISSUE')
  @ApiOperation({ summary: 'Cancel invoice' })
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.invoicesService.cancel(id, user.tenantId);
  }
}
