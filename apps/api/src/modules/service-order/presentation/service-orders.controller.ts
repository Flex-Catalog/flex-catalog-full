import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  Res,
  HttpCode,
  HttpStatus,
  BadRequestException,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import { createContext } from '../../../@core/application/use-case.interface';
import { Result, ValidationError, NotFoundError } from '../../../@core/domain/result';
import { IEventBus } from '../../../@core/domain/domain-event.base';
import { EVENT_BUS } from '../../../@core/infrastructure/event-bus';
import {
  ServiceOrder,
  CreateServiceOrderInput,
  UpdateServiceOrderInput,
  TransportedPerson,
} from '../domain/aggregates/service-order.aggregate';
import {
  IServiceOrderRepository,
  SERVICE_ORDER_REPOSITORY,
  ServiceOrderQueryOptions,
} from '../infrastructure/persistence/service-order.repository';
import { PdfGeneratorService } from '../infrastructure/documents/pdf-generator.service';

/**
 * Create Service Order DTO
 */
interface CreateServiceOrderDto {
  serviceType: string;
  serviceDescription: string;
  serviceDate: string;
  startTime: string;
  endTime?: string;
  vesselName: string;
  vesselType: string;
  anchorageArea?: string;
  companyName: string;
  companyTaxId?: string;
  boatName?: string;
  captainName?: string;
  employeeId?: string;
  employeeName?: string;
  transportedPeople?: TransportedPerson[];
  requestedBy?: string;
  voucherNumber?: string;
  rateCents: number;
  currency?: string;
  additionalChargesCents?: number;
  discountCents?: number;
  notes?: string;
}

/**
 * Service Orders Controller
 */
@ApiTags('Service Orders')
@ApiBearerAuth()
@Controller('service-orders')
export class ServiceOrdersController {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly repository: IServiceOrderRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
    private readonly pdfGenerator: PdfGeneratorService,
  ) {}

  @Get()
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'List service orders' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'companyName', required: false })
  @ApiQuery({ name: 'vesselName', required: false })
  async findAll(
    @CurrentUser() user: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('companyName') companyName?: string,
    @Query('vesselName') vesselName?: string,
  ) {
    const options: ServiceOrderQueryOptions = {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      status: status as any,
      search,
      companyName,
      vesselName,
    };

    const result = await this.repository.findAll(user.tenantId, options);
    if (result.isFailure) throw new BadRequestException(result.error.message);

    const paginated = result.value;
    return {
      data: paginated.data.map((o: ServiceOrder) => o.toDocumentData()),
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
      totalPages: paginated.totalPages,
    };
  }

  @Get(':id')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get service order by ID' })
  async findOne(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.repository.findById(id, user.tenantId);
    if (result.isFailure) throw new NotFoundException('Service order not found');
    return result.value.toDocumentData();
  }

  @Post()
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Create service order' })
  @HttpCode(HttpStatus.CREATED)
  async create(@CurrentUser() user: any, @Body() dto: CreateServiceOrderDto) {
    const input: CreateServiceOrderInput = {
      tenantId: user.tenantId,
      serviceType: dto.serviceType,
      serviceDescription: dto.serviceDescription,
      serviceDate: new Date(dto.serviceDate),
      startTime: new Date(dto.startTime),
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      vesselName: dto.vesselName,
      vesselType: dto.vesselType,
      anchorageArea: dto.anchorageArea,
      companyName: dto.companyName,
      companyTaxId: dto.companyTaxId,
      boatName: dto.boatName,
      captainName: dto.captainName,
      employeeId: dto.employeeId,
      employeeName: dto.employeeName,
      transportedPeople: dto.transportedPeople,
      requestedBy: dto.requestedBy,
      voucherNumber: dto.voucherNumber,
      rateCents: dto.rateCents,
      currency: dto.currency,
      additionalChargesCents: dto.additionalChargesCents,
      discountCents: dto.discountCents,
      notes: dto.notes,
      createdById: user.id,
    };

    const orderResult = ServiceOrder.create(input);
    if (orderResult.isFailure) throw new BadRequestException(orderResult.error.message);

    const order = orderResult.value;
    const saveResult = await this.repository.save(order);
    if (saveResult.isFailure) throw new BadRequestException(saveResult.error.message);

    await this.eventBus.publishAll([...order.domainEvents]);
    order.clearDomainEvents();

    return order.toDocumentData();
  }

  @Patch(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Update service order' })
  async update(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: any) {
    const findResult = await this.repository.findById(id, user.tenantId);
    if (findResult.isFailure) throw new NotFoundException('Service order not found');

    const order = findResult.value;
    const updateInput: UpdateServiceOrderInput = {
      endTime: dto.endTime ? new Date(dto.endTime) : undefined,
      boatName: dto.boatName,
      captainName: dto.captainName,
      employeeName: dto.employeeName,
      transportedPeople: dto.transportedPeople,
      additionalChargesCents: dto.additionalChargesCents,
      discountCents: dto.discountCents,
      notes: dto.notes,
      updatedById: user.id,
    };

    const updateResult = order.update(updateInput);
    if (updateResult.isFailure) throw new BadRequestException(updateResult.error.message);

    await this.repository.save(order);
    await this.eventBus.publishAll([...order.domainEvents]);
    order.clearDomainEvents();

    return order.toDocumentData();
  }

  @Post(':id/start')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Start service' })
  async startService(@CurrentUser() user: any, @Param('id') id: string) {
    const findResult = await this.repository.findById(id, user.tenantId);
    if (findResult.isFailure) throw new NotFoundException('Service order not found');

    const order = findResult.value;
    const result = order.startService(user.id);
    if (result.isFailure) throw new BadRequestException(result.error.message);

    await this.repository.save(order);
    return order.toDocumentData();
  }

  @Post(':id/complete')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Complete service' })
  async completeService(@CurrentUser() user: any, @Param('id') id: string, @Body() dto: { endTime: string }) {
    const findResult = await this.repository.findById(id, user.tenantId);
    if (findResult.isFailure) throw new NotFoundException('Service order not found');

    const order = findResult.value;
    const result = order.completeService(new Date(dto.endTime), user.id);
    if (result.isFailure) throw new BadRequestException(result.error.message);

    await this.repository.save(order);
    await this.eventBus.publishAll([...order.domainEvents]);
    order.clearDomainEvents();

    return order.toDocumentData();
  }

  @Post(':id/cancel')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Cancel service order' })
  async cancelOrder(@CurrentUser() user: any, @Param('id') id: string) {
    const findResult = await this.repository.findById(id, user.tenantId);
    if (findResult.isFailure) throw new NotFoundException('Service order not found');

    const order = findResult.value;
    const result = order.cancel(user.id);
    if (result.isFailure) throw new BadRequestException(result.error.message);

    await this.repository.save(order);
    await this.eventBus.publishAll([...order.domainEvents]);
    order.clearDomainEvents();

    return { success: true };
  }

  /**
   * Generate internal service receipt (PDF-like HTML)
   */
  @Get(':id/receipt')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get service receipt (HTML for print/PDF)' })
  async getReceipt(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const findResult = await this.repository.findById(id, user.tenantId);
    if (findResult.isFailure) throw new NotFoundException('Service order not found');

    const data = findResult.value.toDocumentData();
    const html = this.pdfGenerator.generateServiceReceiptHtml(data);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /**
   * Generate NFS-e (Nota Fiscal de Servico)
   */
  @Get(':id/nfse')
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'Get NFS-e (HTML for print/PDF)' })
  async getNfse(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const findResult = await this.repository.findById(id, user.tenantId);
    if (findResult.isFailure) throw new NotFoundException('Service order not found');

    const data = findResult.value.toDocumentData();

    // TODO: Get issuer data from tenant config
    const issuerData = {
      name: 'Empresa Prestadora de Servicos',
      taxId: '00.000.000/0000-00',
      municipalRegistration: '000000',
      address: 'Endereco da empresa',
    };

    const html = this.pdfGenerator.generateNfseHtml(data, issuerData);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Delete(':id')
  @RequirePermissions('PRODUCT_WRITE')
  @ApiOperation({ summary: 'Delete service order' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(@CurrentUser() user: any, @Param('id') id: string) {
    const result = await this.repository.delete(id, user.tenantId);
    if (result.isFailure) throw new BadRequestException(result.error.message);
  }
}
