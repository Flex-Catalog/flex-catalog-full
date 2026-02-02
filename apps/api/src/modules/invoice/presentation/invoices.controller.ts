import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions, RequireFeatures } from '../../../common/decorators';
import { AuthUser } from '@product-catalog/shared';
import { createContext } from '../../../@core/application/use-case.interface';
import { ValidationError, NotFoundError } from '../../../@core/domain/result';
import {
  CreateInvoiceUseCase,
  IssueInvoiceUseCase,
  CancelInvoiceUseCase,
  GetInvoiceQuery,
  ListInvoicesQuery,
  CreateInvoiceDto,
} from '../application/use-cases/invoice.use-cases';

/**
 * Invoices Controller
 */
@ApiTags('Invoices')
@ApiBearerAuth()
@Controller('invoices')
@RequireFeatures('INVOICES')
export class InvoicesController {
  constructor(
    private readonly createInvoiceUseCase: CreateInvoiceUseCase,
    private readonly issueInvoiceUseCase: IssueInvoiceUseCase,
    private readonly cancelInvoiceUseCase: CancelInvoiceUseCase,
    private readonly getInvoiceQuery: GetInvoiceQuery,
    private readonly listInvoicesQuery: ListInvoicesQuery,
  ) {}

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
    const result = await this.listInvoicesQuery.execute({
      context: createContext(user.tenantId, user.id),
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      status,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }

    return result.value;
  }

  @Get(':id')
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'Get invoice by ID' })
  async findOne(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.getInvoiceQuery.execute({
      context: createContext(user.tenantId, user.id),
      invoiceId: id,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }

    return result.value;
  }

  @Post()
  @RequirePermissions('INVOICE_ISSUE')
  @ApiOperation({ summary: 'Create new invoice' })
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: AuthUser, @Body() dto: CreateInvoiceDto) {
    const result = await this.createInvoiceUseCase.execute({
      context: createContext(user.tenantId, user.id),
      data: dto,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }

    return result.value;
  }

  @Post(':id/issue')
  @RequirePermissions('INVOICE_ISSUE')
  @ApiOperation({ summary: 'Issue invoice (generate fiscal document)' })
  async issue(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.issueInvoiceUseCase.execute({
      context: createContext(user.tenantId, user.id),
      invoiceId: id,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }

    return result.value;
  }

  @Patch(':id/cancel')
  @RequirePermissions('INVOICE_ISSUE')
  @ApiOperation({ summary: 'Cancel invoice' })
  async cancel(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const result = await this.cancelInvoiceUseCase.execute({
      context: createContext(user.tenantId, user.id),
      invoiceId: id,
    });

    if (result.isFailure) {
      throw this.mapError(result.error);
    }

    return { success: true };
  }

  private mapError(error: Error): Error {
    if (error instanceof ValidationError) {
      return new BadRequestException(error.message);
    }
    if (error instanceof NotFoundError) {
      return new NotFoundException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
