/**
 * Remove apenas formatação de CPF/CNPJ (. - / espaços). Letras preservadas.
 * CNPJ alfanumérico vigora a partir de julho/2026 (IN RFB nº 2229/2024).
 */
function stripFiscalId(value: string): string {
  return value.replace(/[.\-\/\s]/g, '').toUpperCase();
}

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
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
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
import { FocusNfeService, FiscalConfig } from '../infrastructure/fiscal/focus-nfe.service';
import { PrismaService } from '../../../prisma/prisma.service';

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
  private readonly logger = new Logger(ServiceOrdersController.name);

  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly repository: IServiceOrderRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
    private readonly pdfGenerator: PdfGeneratorService,
    private readonly focusNfeService: FocusNfeService,
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
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

    // Load tenant fiscal config for the receipt header
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, taxId: true, fiscalConfig: true },
    });
    const fiscal = (tenant?.fiscalConfig ?? {}) as FiscalConfig;
    const issuerData = {
      name: fiscal.razaoSocial || tenant?.name || 'Empresa Prestadora de Serviços',
      taxId: tenant?.taxId || '—',
      municipalRegistration: fiscal.inscricaoMunicipal || '—',
      address: [
        fiscal.logradouro,
        fiscal.numero ? `nº ${fiscal.numero}` : null,
        fiscal.bairro,
        fiscal.municipio,
        fiscal.uf,
        fiscal.cep,
      ]
        .filter(Boolean)
        .join(', ') || '—',
    };

    const html = this.pdfGenerator.generateServiceReceiptHtml({ ...data, issuerData });

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  /**
   * Generate or retrieve NFS-e (Nota Fiscal de Serviço Eletrônica)
   *
   * Flow:
   * 1. If tenant has Focus NFe configured AND nfseData not yet stored → emit via Focus NFe API
   * 2. If Focus NFe is authorized → store result, return HTML with official NFS-e data
   * 3. If no Focus NFe token → return local HTML with company data (not officially submitted)
   */
  @Get(':id/nfse')
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'Get NFS-e (HTML for print/PDF) or emit via Focus NFe' })
  async getNfse(@CurrentUser() user: any, @Param('id') id: string, @Res() res: Response) {
    const findResult = await this.repository.findById(id, user.tenantId);
    if (findResult.isFailure) throw new NotFoundException('Service order not found');

    const data = findResult.value.toDocumentData();

    // Load tenant fiscal config
    const tenant = await this.prisma.tenant.findUnique({
      where: { id: user.tenantId },
      select: { name: true, taxId: true, fiscalConfig: true },
    });
    const fiscal = (tenant?.fiscalConfig ?? {}) as FiscalConfig;

    // Build issuer data from tenant fiscal config
    const issuerData = {
      name: fiscal.razaoSocial || tenant?.name || 'Empresa Prestadora de Serviços',
      taxId: tenant?.taxId || '—',
      municipalRegistration: fiscal.inscricaoMunicipal || '—',
      address: [
        fiscal.logradouro,
        fiscal.numero ? `nº ${fiscal.numero}` : null,
        fiscal.bairro,
        fiscal.municipio,
        fiscal.uf,
        fiscal.cep,
      ]
        .filter(Boolean)
        .join(', ') || '—',
    };

    // Check if NFS-e was already issued (stored in nfseData field)
    let nfseInfo: Record<string, unknown> | null = (data as any).nfseData ?? null;
    let nfseWarning: string | null = null;

    // Platform-level Focus NFe token (set by platform admin via env var)
    const platformToken = this.configService.get<string>('FOCUS_NFE_TOKEN');
    const platformAmbiente = this.configService.get<string>('FOCUS_NFE_AMBIENTE') ?? fiscal.ambiente ?? 'homologacao';

    // If Focus NFe is configured and NFS-e not yet issued → emit now
    if (
      !nfseInfo &&
      platformToken &&
      fiscal.inscricaoMunicipal &&
      fiscal.codigoMunicipio &&
      tenant?.taxId
    ) {
      this.logger.log(`Emitindo NFS-e via Focus NFe para OS ${data.orderNumber}`);

      const itemListaServico = fiscal.itemListaServico || '17.01'; // default: transporte
      const aliquotaISS = fiscal.aliquotaISS ?? 5.0;
      const ambiente = platformAmbiente as 'homologacao' | 'producao';
      const totalCents = (data as any).totalCents as number;
      const totalReais = totalCents / 100;

      // Build tomador (client) from service order data
      const companyTaxId = (data as any).companyTaxId as string | undefined;
      const tomador: any = {
        razaoSocial: (data as any).companyName as string,
      };
      if (companyTaxId) {
        const normalized = stripFiscalId(companyTaxId);
        if (normalized.length === 14) tomador.cnpj = normalized;
        else if (normalized.length === 11) tomador.cpf = normalized;
      }

      // Discriminação composta com informações do serviço
      const discriminacao = [
        `Serviço: ${(data as any).serviceTypeLabel}`,
        `Descrição: ${(data as any).serviceDescription}`,
        `Embarcação: ${(data as any).vesselName} (${(data as any).vesselTypeLabel})`,
        `Data: ${new Date((data as any).serviceDate as string).toLocaleDateString('pt-BR')}`,
        (data as any).anchorageArea ? `Área de Fundeio: ${(data as any).anchorageArea}` : null,
        (data as any).voucherNumber ? `Voucher: ${(data as any).voucherNumber}` : null,
        (data as any).notes ? `Obs: ${(data as any).notes}` : null,
      ]
        .filter(Boolean)
        .join(' | ');

      const result = await this.focusNfeService.emitirNfse({
        token: platformToken,
        ambiente,
        ref: `OS-${(data as any).orderNumber}`,
        dataEmissao: new Date((data as any).serviceDate as string)
          .toISOString()
          .split('T')[0],
        prestador: {
          cnpj: stripFiscalId(tenant.taxId),
          inscricaoMunicipal: fiscal.inscricaoMunicipal,
          codigoMunicipio: fiscal.codigoMunicipio,
        },
        tomador,
        servico: {
          valorServicos: totalReais,
          issrfRetido: false,
          itemListaServico,
          discriminacao,
          codigoMunicipio: fiscal.codigoMunicipio,
          aliquota: aliquotaISS,
          codigoTributacaoMunicipal: fiscal.codigoTributacaoMunicipal,
        },
      });

      if (result.success && result.data) {
        nfseInfo = {
          numero: result.data.numero,
          codigoVerificacao: result.data.codigoVerificacao,
          pdfUrl: result.data.pdfUrl,
          xmlBase64: result.data.xmlBase64,
          status: result.data.status,
          ref: result.data.ref,
          ambiente,
          issuedAt: new Date().toISOString(),
        };

        // Persist nfseData in the ServiceOrder document (MongoDB - schemaless)
        await this.prisma.serviceOrder.update({
          where: { id: id },
          data: { nfseData: nfseInfo } as any,
        });
      } else {
        nfseWarning = result.error || 'Não foi possível emitir a NFS-e via Focus NFe.';
        this.logger.warn(`NFS-e não emitida: ${nfseWarning}`);
      }
    } else if (!platformToken) {
      nfseWarning =
        'A plataforma ainda não configurou a integração com Focus NFe. Entre em contato com o suporte.';
    }

    // If Focus NFe returned a PDF URL and NFS-e is authorized → redirect to official PDF
    if (nfseInfo?.pdfUrl && (nfseInfo as any).status === 'autorizado') {
      return res.redirect(nfseInfo.pdfUrl as string);
    }

    // Generate local HTML (with official data if available)
    const html = this.pdfGenerator.generateNfseHtml(data, issuerData, nfseInfo, nfseWarning);

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
