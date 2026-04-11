import { Injectable } from '@nestjs/common';
import { IQuery, UseCaseContext } from '../../../../@core/application/use-case.interface';
import { Result } from '../../../../@core/domain/result';
import { PrismaService } from '../../../../prisma/prisma.service';

// ============ DTOs ============

export interface DashboardSummaryDto {
  readonly products: {
    readonly total: number;
    readonly active: number;
    readonly inactive: number;
  };
  readonly categories: {
    readonly total: number;
  };
  readonly invoices: {
    readonly total: number;
    readonly issued: number;
    readonly pending: number;
    readonly draft: number;
    readonly failed: number;
  };
  readonly serviceOrders: {
    readonly total: number;
    readonly open: number;
    readonly completed: number;
  };
  readonly revenue: {
    readonly month: number;
    readonly byCurrency: Array<{ currency: string; amount: number }>;
  };
}

export interface RevenueDataPoint {
  readonly date: string;
  readonly amount: number;
  readonly count: number;
}

export interface RevenueAnalyticsDto {
  readonly period: 'daily' | 'weekly' | 'monthly';
  readonly data: RevenueDataPoint[];
  readonly total: number;
  readonly currency: string;
}

export interface InvoiceMetricsDto {
  readonly byStatus: Record<string, number>;
  readonly byCountry: Record<string, number>;
  readonly trend: Array<{
    readonly date: string;
    readonly issued: number;
    readonly failed: number;
  }>;
}

export interface ProductMetricsDto {
  readonly byCategory: Array<{
    readonly categoryId: string | null;
    readonly categoryName: string;
    readonly count: number;
  }>;
  readonly activeVsInactive: {
    readonly active: number;
    readonly inactive: number;
  };
}

export interface ActivityItemDto {
  readonly id: string;
  readonly action: string;
  readonly entity: string;
  readonly entityId: string | null;
  readonly entityName: string | null;
  readonly userName: string;
  readonly createdAt: Date;
}

// ============ Queries ============

/**
 * Get Dashboard Summary Query
 */
@Injectable()
export class GetDashboardSummaryQuery
  implements IQuery<{ context: UseCaseContext }, DashboardSummaryDto>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: { context: UseCaseContext }): Promise<Result<DashboardSummaryDto, Error>> {
    const { tenantId } = input.context;

    // Run queries in parallel for performance
    const [
      productsTotal,
      productsActive,
      categoriesTotal,
      invoiceStats,
      serviceOrderStats,
      revenueStats,
    ] = await Promise.all([
      this.prisma.product.count({ where: { tenantId } }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.category.count({ where: { tenantId } }),
      this.getInvoiceStats(tenantId),
      this.getServiceOrderStats(tenantId),
      this.getRevenueStats(tenantId),
    ]);

    return Result.ok(
      Object.freeze({
        products: {
          total: productsTotal,
          active: productsActive,
          inactive: productsTotal - productsActive,
        },
        categories: {
          total: categoriesTotal,
        },
        invoices: invoiceStats,
        serviceOrders: serviceOrderStats,
        revenue: revenueStats,
      }),
    );
  }

  private async getInvoiceStats(tenantId: string) {
    const stats = await this.prisma.invoice.groupBy({
      by: ['status'],
      where: { tenantId },
      _count: true,
    });

    const counts: Record<string, number> = {
      DRAFT: 0,
      PENDING: 0,
      ISSUED: 0,
      FAILED: 0,
      CANCELED: 0,
    };

    for (const stat of stats) {
      counts[stat.status] = stat._count;
    }

    return {
      total: Object.values(counts).reduce((a, b) => a + b, 0),
      issued: counts.ISSUED,
      pending: counts.PENDING,
      draft: counts.DRAFT,
      failed: counts.FAILED,
    };
  }

  private async getServiceOrderStats(tenantId: string) {
    const [total, open, completed] = await Promise.all([
      this.prisma.serviceOrder.count({ where: { tenantId } }),
      this.prisma.serviceOrder.count({ where: { tenantId, status: { in: ['DRAFT', 'IN_PROGRESS'] } } }),
      this.prisma.serviceOrder.count({ where: { tenantId, status: 'COMPLETED' } }),
    ]);
    return { total, open, completed };
  }

  private async getRevenueStats(tenantId: string) {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    // Fetch all invoices issued this month
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: 'ISSUED',
        issuedAt: { gte: startOfMonth },
      },
      select: { payload: true },
    });

    // Sum by currency extracted from payload
    const byCurrency = new Map<string, number>();
    for (const inv of invoices) {
      const p = inv.payload as any;
      const amount: number = p?.total ?? p?.valorServicos ?? p?.valorTotal ?? 0;
      const currency: string = p?.currency ?? p?.moeda ?? 'BRL';
      byCurrency.set(currency, (byCurrency.get(currency) ?? 0) + amount);
    }

    const byCurrencyArr = Array.from(byCurrency.entries()).map(([currency, amount]) => ({
      currency,
      amount,
    }));

    const month = byCurrencyArr.reduce((s, x) => s + x.amount, 0);

    return {
      month,
      byCurrency: byCurrencyArr,
    };
  }
}

/**
 * Get Revenue Analytics Query
 */
@Injectable()
export class GetRevenueAnalyticsQuery
  implements
    IQuery<
      { context: UseCaseContext; period: 'daily' | 'weekly' | 'monthly'; startDate?: Date; endDate?: Date },
      RevenueAnalyticsDto
    >
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: {
      context: UseCaseContext;
      period: 'daily' | 'weekly' | 'monthly';
      startDate?: Date;
      endDate?: Date;
    },
  ): Promise<Result<RevenueAnalyticsDto, Error>> {
    const { tenantId } = input.context;
    const { period } = input;

    const endDate = input.endDate ?? new Date();
    const startDate = input.startDate ?? this.getDefaultStartDate(period, endDate);

    // Get issued invoices within the period
    const invoices = await this.prisma.invoice.findMany({
      where: {
        tenantId,
        status: 'ISSUED',
        issuedAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      select: {
        issuedAt: true,
        payload: true,
      },
    });

    // Group by period
    const groupedData = this.groupByPeriod(invoices, period);

    const total = groupedData.reduce((sum, d) => sum + d.amount, 0);

    return Result.ok(
      Object.freeze({
        period,
        data: groupedData,
        total,
        currency: 'BRL',
      }),
    );
  }

  private getDefaultStartDate(period: 'daily' | 'weekly' | 'monthly', endDate: Date): Date {
    const start = new Date(endDate);
    switch (period) {
      case 'daily':
        start.setDate(start.getDate() - 30);
        break;
      case 'weekly':
        start.setDate(start.getDate() - 12 * 7);
        break;
      case 'monthly':
        start.setMonth(start.getMonth() - 12);
        break;
    }
    return start;
  }

  private groupByPeriod(
    invoices: Array<{ issuedAt: Date | null; payload: any }>,
    period: 'daily' | 'weekly' | 'monthly',
  ): RevenueDataPoint[] {
    const groups = new Map<string, { amount: number; count: number }>();

    for (const invoice of invoices) {
      if (!invoice.issuedAt) continue;

      const key = this.getGroupKey(invoice.issuedAt, period);
      const existing = groups.get(key) ?? { amount: 0, count: 0 };

      // Extract total from payload
      const payload = invoice.payload as any;
      const total = payload?.total ?? payload?.valorTotal ?? 10000; // Default mock value

      groups.set(key, {
        amount: existing.amount + total,
        count: existing.count + 1,
      });
    }

    return Array.from(groups.entries())
      .map(([date, data]) => ({
        date,
        amount: data.amount,
        count: data.count,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  private getGroupKey(date: Date, period: 'daily' | 'weekly' | 'monthly'): string {
    switch (period) {
      case 'daily':
        return date.toISOString().split('T')[0];
      case 'weekly':
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        return weekStart.toISOString().split('T')[0];
      case 'monthly':
        return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    }
  }
}

/**
 * Get Invoice Metrics Query
 */
@Injectable()
export class GetInvoiceMetricsQuery
  implements IQuery<{ context: UseCaseContext }, InvoiceMetricsDto>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: { context: UseCaseContext }): Promise<Result<InvoiceMetricsDto, Error>> {
    const { tenantId } = input.context;

    const [byStatus, byCountry, recentInvoices] = await Promise.all([
      this.prisma.invoice.groupBy({
        by: ['status'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.invoice.groupBy({
        by: ['country'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.invoice.findMany({
        where: {
          tenantId,
          createdAt: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          status: true,
          createdAt: true,
        },
      }),
    ]);

    // Convert to records
    const statusCounts: Record<string, number> = {};
    for (const item of byStatus) {
      statusCounts[item.status] = item._count;
    }

    const countryCounts: Record<string, number> = {};
    for (const item of byCountry) {
      countryCounts[item.country] = item._count;
    }

    // Calculate daily trend
    const trendMap = new Map<string, { issued: number; failed: number }>();
    for (const invoice of recentInvoices) {
      const date = invoice.createdAt.toISOString().split('T')[0];
      const existing = trendMap.get(date) ?? { issued: 0, failed: 0 };
      if (invoice.status === 'ISSUED') {
        existing.issued++;
      } else if (invoice.status === 'FAILED') {
        existing.failed++;
      }
      trendMap.set(date, existing);
    }

    const trend = Array.from(trendMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return Result.ok(
      Object.freeze({
        byStatus: statusCounts,
        byCountry: countryCounts,
        trend,
      }),
    );
  }
}

/**
 * Get Product Metrics Query
 */
@Injectable()
export class GetProductMetricsQuery
  implements IQuery<{ context: UseCaseContext }, ProductMetricsDto>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: { context: UseCaseContext }): Promise<Result<ProductMetricsDto, Error>> {
    const { tenantId } = input.context;

    const [byCategory, activeCount, inactiveCount, categories] = await Promise.all([
      this.prisma.product.groupBy({
        by: ['categoryId'],
        where: { tenantId },
        _count: true,
      }),
      this.prisma.product.count({ where: { tenantId, isActive: true } }),
      this.prisma.product.count({ where: { tenantId, isActive: false } }),
      this.prisma.category.findMany({
        where: { tenantId },
        select: { id: true, name: true },
      }),
    ]);

    // Create category name map
    const categoryMap = new Map<string, string>();
    for (const cat of categories) {
      categoryMap.set(cat.id, cat.name);
    }

    const categoryStats = byCategory.map((item: any) => ({
      categoryId: item.categoryId,
      categoryName: item.categoryId ? categoryMap.get(item.categoryId) ?? 'Unknown' : 'Uncategorized',
      count: item._count,
    }));

    return Result.ok(
      Object.freeze({
        byCategory: categoryStats,
        activeVsInactive: {
          active: activeCount,
          inactive: inactiveCount,
        },
      }),
    );
  }
}

// Re-export so module/controller imports are consistent
export { GetSalesMetricsQuery } from './get-sales-metrics.query';

/**
 * Get Recent Activity Query
 */
@Injectable()
export class GetRecentActivityQuery
  implements IQuery<{ context: UseCaseContext; limit?: number }, ActivityItemDto[]>
{
  constructor(private readonly prisma: PrismaService) {}

  async execute(
    input: { context: UseCaseContext; limit?: number },
  ): Promise<Result<ActivityItemDto[], Error>> {
    const { tenantId } = input.context;
    const limit = input.limit ?? 20;

    const logs = await this.prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: { name: true },
        },
      },
    });

    const activities = logs.map((log: any) =>
      Object.freeze({
        id: log.id,
        action: log.action,
        entity: log.entity,
        entityId: log.entityId,
        entityName: log.entityName,
        userName: log.user?.name ?? 'System',
        createdAt: log.createdAt,
      }),
    );

    return Result.ok(activities);
  }
}
