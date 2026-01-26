import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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

  async create(tenantId: string, input: CreateInvoiceInput) {
    return this.prisma.invoice.create({
      data: {
        tenantId,
        country: input.country,
        status: 'DRAFT',
        payload: input.payload as any,
      },
    });
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

  async issue(id: string, tenantId: string) {
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
      };

      if (result.error) {
        updateData.status = 'FAILED';
      } else {
        updateData.status = 'ISSUED';
      }

      return this.prisma.invoice.update({
        where: { id },
        data: updateData,
      });
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

  async cancel(id: string, tenantId: string) {
    const invoice = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    if (invoice.status === 'ISSUED') {
      throw new BadRequestException('Issued invoices cannot be canceled');
    }

    return this.prisma.invoice.update({
      where: { id },
      data: { status: 'CANCELED' },
    });
  }
}
