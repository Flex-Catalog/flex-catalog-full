import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Result, NotFoundError } from '../../../../@core/domain/result';
import { PaginatedResult, createPaginatedResult } from '../../../../@core/domain/repository.interface';
import { Invoice } from '../../domain/aggregates/invoice/invoice.aggregate';
import { IInvoiceRepository, InvoiceQueryOptions } from '../../domain/repositories/invoice.repository.interface';
import { InvoiceStatusValue } from '../../domain/value-objects/invoice-status.vo';

/**
 * Prisma Invoice Repository
 */
@Injectable()
export class PrismaInvoiceRepository implements IInvoiceRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<Result<Invoice, Error>> {
    const record = await this.prisma.invoice.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      return Result.fail(new NotFoundError('Invoice', id));
    }

    return Result.ok(this.toDomain(record));
  }

  async findAll(
    tenantId: string,
    options: InvoiceQueryOptions,
  ): Promise<Result<PaginatedResult<Invoice>, Error>> {
    const where: any = { tenantId };

    if (options.status) {
      where.status = options.status;
    }

    if (options.country) {
      where.country = options.country.toUpperCase();
    }

    if (options.startDate || options.endDate) {
      where.createdAt = {};
      if (options.startDate) {
        where.createdAt.gte = options.startDate;
      }
      if (options.endDate) {
        where.createdAt.lte = options.endDate;
      }
    }

    const skip = (options.page - 1) * options.limit;

    const [records, total] = await Promise.all([
      this.prisma.invoice.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.invoice.count({ where }),
    ]);

    const invoices = records.map((r: any) => this.toDomain(r));

    return Result.ok(createPaginatedResult(invoices, total, options));
  }

  async save(invoice: Invoice): Promise<Result<void, Error>> {
    const data = this.toPersistence(invoice);

    await this.prisma.invoice.upsert({
      where: { id: invoice.id },
      create: data as any,
      update: {
        status: data.status,
        result: data.result as any,
        updatedById: data.updatedById,
        issuedById: data.issuedById,
        issuedAt: data.issuedAt,
        updatedAt: new Date(),
      },
    });

    return Result.void();
  }

  async countByStatus(tenantId: string, status: InvoiceStatusValue): Promise<number> {
    return this.prisma.invoice.count({
      where: { tenantId, status },
    });
  }

  async countByCountry(tenantId: string): Promise<Record<string, number>> {
    const results = await this.prisma.invoice.groupBy({
      by: ['country'],
      where: { tenantId },
      _count: true,
    });

    const counts: Record<string, number> = {};
    for (const result of results) {
      counts[result.country] = result._count;
    }
    return counts;
  }

  private toDomain(record: any): Invoice {
    return Invoice.reconstitute(record.id, {
      tenantId: record.tenantId,
      country: record.country,
      status: record.status,
      payload: record.payload ?? {},
      result: record.result,
      createdById: record.createdById ?? record.tenantId,
      updatedById: record.updatedById ?? record.tenantId,
      issuedById: record.issuedById,
      issuedAt: record.issuedAt,
      createdAt: record.createdAt,
    });
  }

  private toPersistence(invoice: Invoice): Record<string, unknown> {
    return {
      id: invoice.id,
      tenantId: invoice.tenantId,
      country: invoice.country,
      status: invoice.status,
      payload: invoice.payload,
      result: invoice.result,
      createdById: invoice.createdById,
      updatedById: invoice.updatedById,
      issuedById: invoice.issuedById,
      issuedAt: invoice.issuedAt,
    };
  }
}
