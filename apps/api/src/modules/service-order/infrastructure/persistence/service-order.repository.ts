import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Result, NotFoundError } from '../../../../@core/domain/result';
import { PaginatedResult, createPaginatedResult, QueryOptions } from '../../../../@core/domain/repository.interface';
import { ServiceOrder, ServiceOrderStatus } from '../../domain/aggregates/service-order.aggregate';

export interface ServiceOrderQueryOptions extends QueryOptions {
  readonly status?: ServiceOrderStatus;
  readonly companyName?: string;
  readonly vesselName?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
  readonly search?: string;
}

export interface IServiceOrderRepository {
  findById(id: string, tenantId: string): Promise<Result<ServiceOrder, Error>>;
  findAll(tenantId: string, options: ServiceOrderQueryOptions): Promise<Result<PaginatedResult<ServiceOrder>, Error>>;
  save(order: ServiceOrder): Promise<Result<void, Error>>;
  delete(id: string, tenantId: string): Promise<Result<void, Error>>;
}

export const SERVICE_ORDER_REPOSITORY = Symbol('SERVICE_ORDER_REPOSITORY');

@Injectable()
export class PrismaServiceOrderRepository implements IServiceOrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<Result<ServiceOrder, Error>> {
    const record = await this.prisma.serviceOrder.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      return Result.fail(new NotFoundError('ServiceOrder', id));
    }

    return Result.ok(ServiceOrder.reconstitute(record.id, record));
  }

  async findAll(
    tenantId: string,
    options: ServiceOrderQueryOptions,
  ): Promise<Result<PaginatedResult<ServiceOrder>, Error>> {
    const where: any = { tenantId };

    if (options.status) where.status = options.status;
    if (options.companyName) where.companyName = { contains: options.companyName, mode: 'insensitive' };
    if (options.vesselName) where.vesselName = { contains: options.vesselName, mode: 'insensitive' };

    if (options.startDate || options.endDate) {
      where.serviceDate = {};
      if (options.startDate) where.serviceDate.gte = options.startDate;
      if (options.endDate) where.serviceDate.lte = options.endDate;
    }

    if (options.search) {
      where.OR = [
        { orderNumber: { contains: options.search, mode: 'insensitive' } },
        { companyName: { contains: options.search, mode: 'insensitive' } },
        { vesselName: { contains: options.search, mode: 'insensitive' } },
        { voucherNumber: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const skip = (options.page - 1) * options.limit;

    const [records, total] = await Promise.all([
      this.prisma.serviceOrder.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.serviceOrder.count({ where }),
    ]);

    const orders = records.map((r: any) => ServiceOrder.reconstitute(r.id, r));
    return Result.ok(createPaginatedResult(orders, total, options));
  }

  async save(order: ServiceOrder): Promise<Result<void, Error>> {
    const data = order.toPersistence();

    await this.prisma.serviceOrder.upsert({
      where: { id: order.id },
      create: data as any,
      update: {
        status: data.status,
        endTime: data.endTime as any,
        servicePeriod: data.servicePeriod as any,
        boatName: data.boatName as any,
        captainName: data.captainName as any,
        employeeName: data.employeeName as any,
        transportedPeople: data.transportedPeople as any,
        additionalChargesCents: data.additionalChargesCents as any,
        discountCents: data.discountCents as any,
        totalCents: data.totalCents as any,
        notes: data.notes as any,
        updatedById: data.updatedById as any,
        updatedAt: new Date(),
      },
    });

    return Result.void();
  }

  async delete(id: string, tenantId: string): Promise<Result<void, Error>> {
    await this.prisma.serviceOrder.deleteMany({ where: { id, tenantId } });
    return Result.void();
  }
}
