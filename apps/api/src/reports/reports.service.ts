import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface ProductReport {
  totalProducts: number;
  activeProducts: number;
  inactiveProducts: number;
  productsByCategory: Array<{ categoryId: string; categoryName: string; count: number }>;
  averagePrice: number;
  totalValue: number;
}

export interface SalesReport {
  totalInvoices: number;
  issuedInvoices: number;
  totalRevenue: number;
  invoicesByStatus: Array<{ status: string; count: number }>;
  invoicesByCountry: Array<{ country: string; count: number }>;
}

export interface CategoryReport {
  totalCategories: number;
  categoriesWithProducts: number;
  categoriesWithoutProducts: number;
  topCategories: Array<{ categoryId: string; categoryName: string; productCount: number }>;
}

@Injectable()
export class ReportsService {
  constructor(private readonly prisma: PrismaService) {}

  async getProductReport(tenantId: string): Promise<ProductReport> {
    const products = await this.prisma.product.findMany({
      where: { tenantId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    const totalProducts = products.length;
    const activeProducts = products.filter((p) => p.isActive).length;
    const inactiveProducts = totalProducts - activeProducts;

    // Products by category
    const categoryMap = new Map<string, { name: string; count: number }>();
    products.forEach((product) => {
      const categoryId = product.categoryId || 'uncategorized';
      const categoryName = product.category?.name || 'Uncategorized';
      const current = categoryMap.get(categoryId) || { name: categoryName, count: 0 };
      categoryMap.set(categoryId, { ...current, count: current.count + 1 });
    });

    const productsByCategory = Array.from(categoryMap.entries()).map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      count: data.count,
    }));

    // Calculate average price and total value
    const totalValue = products.reduce((sum, p) => sum + p.priceCents, 0);
    const averagePrice = totalProducts > 0 ? totalValue / totalProducts : 0;

    return {
      totalProducts,
      activeProducts,
      inactiveProducts,
      productsByCategory,
      averagePrice: Math.round(averagePrice),
      totalValue,
    };
  }

  async getSalesReport(tenantId: string): Promise<SalesReport> {
    const invoices = await this.prisma.invoice.findMany({
      where: { tenantId },
    });

    const totalInvoices = invoices.length;
    const issuedInvoices = invoices.filter((i) => i.status === 'ISSUED').length;

    // Calculate revenue from issued invoices
    let totalRevenue = 0;
    invoices.forEach((invoice) => {
      if (invoice.status === 'ISSUED' && invoice.payload) {
        const payload = invoice.payload as any;
        if (payload.items) {
          const invoiceTotal = payload.items.reduce(
            (sum: number, item: any) => sum + (item.totalCents || 0),
            0,
          );
          totalRevenue += invoiceTotal;
        }
      }
    });

    // Invoices by status
    const statusMap = new Map<string, number>();
    invoices.forEach((invoice) => {
      const count = statusMap.get(invoice.status) || 0;
      statusMap.set(invoice.status, count + 1);
    });

    const invoicesByStatus = Array.from(statusMap.entries()).map(([status, count]) => ({
      status,
      count,
    }));

    // Invoices by country
    const countryMap = new Map<string, number>();
    invoices.forEach((invoice) => {
      const count = countryMap.get(invoice.country) || 0;
      countryMap.set(invoice.country, count + 1);
    });

    const invoicesByCountry = Array.from(countryMap.entries()).map(([country, count]) => ({
      country,
      count,
    }));

    return {
      totalInvoices,
      issuedInvoices,
      totalRevenue,
      invoicesByStatus,
      invoicesByCountry,
    };
  }

  async getCategoryReport(tenantId: string): Promise<CategoryReport> {
    const categories = await this.prisma.category.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    const totalCategories = categories.length;
    const categoriesWithProducts = categories.filter((c) => c._count.products > 0).length;
    const categoriesWithoutProducts = totalCategories - categoriesWithProducts;

    const topCategories = categories
      .map((c) => ({
        categoryId: c.id,
        categoryName: c.name,
        productCount: c._count.products,
      }))
      .sort((a, b) => b.productCount - a.productCount)
      .slice(0, 10);

    return {
      totalCategories,
      categoriesWithProducts,
      categoriesWithoutProducts,
      topCategories,
    };
  }

  async getDashboardReport(tenantId: string) {
    const [productReport, salesReport, categoryReport] = await Promise.all([
      this.getProductReport(tenantId),
      this.getSalesReport(tenantId),
      this.getCategoryReport(tenantId),
    ]);

    return {
      products: productReport,
      sales: salesReport,
      categories: categoryReport,
      generatedAt: new Date(),
    };
  }
}
