import { Injectable } from '@nestjs/common';
import { IQuery, UseCaseContext } from '../../../../@core/application/use-case.interface';
import { Result } from '../../../../@core/domain/result';
import { PrismaService } from '../../../../prisma/prisma.service';

export interface SalesMetricsDto {
  readonly revenue: number;
  readonly cost: number;
  readonly profit: number;
  readonly marginPercent: number;
  readonly salesCount: number;
  readonly avgTicket: number;
  readonly stockValue: number;
  readonly lowStockCount: number;
  readonly topProducts: Array<{
    productId: string;
    productName: string;
    totalSold: number;
    totalRevenue: number;
  }>;
}

@Injectable()
export class GetSalesMetricsQuery implements IQuery<{ context: UseCaseContext }, SalesMetricsDto> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(input: { context: UseCaseContext }): Promise<Result<SalesMetricsDto, Error>> {
    const { tenantId } = input.context;

    const [
      salesMetrics,
      stockValue,
      lowStockCount,
      topProducts,
    ] = await Promise.all([
      this.getSalesSummary(tenantId),
      this.getTotalStockValue(tenantId),
      this.getLowStockCount(tenantId),
      this.getTopProducts(tenantId),
    ]);

    return Result.ok({
      revenue: salesMetrics.revenue,
      cost: salesMetrics.cost,
      profit: salesMetrics.profit,
      marginPercent: salesMetrics.marginPercent,
      salesCount: salesMetrics.salesCount,
      avgTicket: salesMetrics.avgTicket,
      stockValue,
      lowStockCount,
      topProducts,
    });
  }

  private async getSalesSummary(tenantId: string) {
    const sales = await this.prisma.sale.findMany({
      where: {
        tenantId,
        status: { in: ['PAID', 'DELIVERED'] },
      },
      include: { items: true },
    });

    const revenue = sales.reduce((sum, sale) => sum + sale.totalCents, 0);
    const cost = sales.reduce((sum, sale) => {
      return sum + sale.items.reduce((itemSum, item) => itemSum + (item.unitCostCents || 0) * item.quantity, 0);
    }, 0);
    const profit = revenue - cost;
    const marginPercent = revenue > 0 ? Math.round((profit / revenue) * 1000) / 10 : 0;

    return {
      revenue,
      cost,
      profit,
      marginPercent,
      salesCount: sales.length,
      avgTicket: sales.length > 0 ? revenue / sales.length / 100 : 0, // in reais
    };
  }

  private async getTotalStockValue(tenantId: string): Promise<number> {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      select: { costCents: true, stockQuantity: true },
    });

    return products.reduce((sum, p) => sum + (p.costCents || 0) * p.stockQuantity, 0);
  }

  private async getLowStockCount(tenantId: string): Promise<number> {
    return this.prisma.product.count({
      where: {
        tenantId,
        stockQuantity: {
          lt: this.prisma.product.fields.stockMinAlert,
        },
      },
    });
  }

  private async getTopProducts(tenantId: string) {
    const top = await this.prisma.saleItem.groupBy({
      by: ['productId', 'productName'],
      where: { sale: { tenantId, status: { in: ['PAID', 'DELIVERED'] } } },
      _sum: { quantity: true, totalCents: true },
      orderBy: { _sum: { totalCents: 'desc' } },
      take: 10,
    });

    return top.map((item) => ({
      productId: item.productId!,
      productName: item.productName!,
      totalSold: item._sum!.quantity || 0,
      totalRevenue: item._sum!.totalCents || 0,
    }));
  }
}

