import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { InvoiceProvider } from './invoice-provider.interface';
import { BrazilProvider } from './providers/brazil.provider';
import { USProvider } from './providers/us.provider';
import { PortugalProvider } from './providers/portugal.provider';
import { CreateInvoiceInput, InvoiceStatus } from '@product-catalog/shared';

@Injectable()
export class InvoicesService {
  private providers: InvoiceProvider[];

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly brazilProvider: BrazilProvider,
    private readonly usProvider: USProvider,
    private readonly portugalProvider: PortugalProvider,
  ) {
    this.providers = [brazilProvider, usProvider, portugalProvider];
  }

  private getProvider(country: string): InvoiceProvider {
    const provider = this.providers.find((p) => p.supportsCountry(country as any));
    if (!provider) {
      throw new BadRequestException(`No fiscal provider available for country: ${country}`);
    }
    return provider;
  }

  async create(tenantId: string, userId: string, input: CreateInvoiceInput) {
    const invoice = await this.prisma.invoice.create({
      data: {
        tenantId,
        country: input.country,
        status: 'DRAFT',
        payload: input.payload as any,
        createdById: userId,
        updatedById: userId,
      },
    });

    // Registra no audit log
    const customerName = (input.payload as any)?.customer?.name ||
                         (input.payload as any)?.recipientName ||
                         'Cliente';
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CREATE',
      entity: 'Invoice',
      entityId: invoice.id,
      entityName: `Invoice ${input.country} - ${customerName}`,
      newData: invoice as any,
    });

    return invoice;
  }

  async findAll(tenantId: string, page = 1, limit = 20, status?: InvoiceStatus) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (status) {
      where.status = status;
    }

    const [invoices, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    return {
      data: invoices,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return invoice;
  }

  async issue(id: string, tenantId: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status !== 'DRAFT') {
      throw new BadRequestException('Only DRAFT invoices can be issued');
    }

    const provider = this.getProvider(invoice.country);
    const payload = invoice.payload as any;

    try {
      // Update status to PENDING
      await this.prisma.invoice.update({
        where: { id },
        data: { status: 'PENDING' },
      });

      const result = await provider.issue(payload, tenantId);

      const updateData: any = {
        result: result as any,
        updatedById: userId,
        issuedById: userId,
        issuedAt: new Date(),
      };

      if (result.error) {
        updateData.status = 'FAILED';
      } else {
        updateData.status = 'ISSUED';
      }

      const updatedInvoice = await this.prisma.invoice.update({
        where: { id },
        data: updateData,
      });

      // Registra no audit log
      const customerName = payload?.customer?.name || payload?.recipientName || 'Cliente';
      await this.auditService.log({
        tenantId,
        userId,
        action: 'ISSUE',
        entity: 'Invoice',
        entityId: id,
        entityName: `Invoice ${invoice.country} - ${customerName}`,
        oldData: { status: invoice.status } as any,
        newData: { status: updatedInvoice.status, result: result } as any,
      });

      return updatedInvoice;
    } catch (error) {
      await this.prisma.invoice.update({
        where: { id },
        data: {
          status: 'FAILED',
          result: {
            error: (error as Error).message,
          } as any,
        },
      });

      throw error;
    }
  }

  async cancel(id: string, tenantId: string, userId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'ISSUED') {
      throw new BadRequestException('Issued invoices cannot be canceled');
    }

    const updatedInvoice = await this.prisma.invoice.update({
      where: { id },
      data: {
        status: 'CANCELED',
        updatedById: userId,
      },
    });

    // Registra no audit log
    const payload = invoice.payload as any;
    const customerName = payload?.customer?.name || payload?.recipientName || 'Cliente';
    await this.auditService.log({
      tenantId,
      userId,
      action: 'CANCEL',
      entity: 'Invoice',
      entityId: id,
      entityName: `Invoice ${invoice.country} - ${customerName}`,
      oldData: { status: invoice.status } as any,
      newData: { status: 'CANCELED' } as any,
    });

    return updatedInvoice;
  }
}
