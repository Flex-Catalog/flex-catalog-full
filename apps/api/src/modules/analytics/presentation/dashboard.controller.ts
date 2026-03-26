import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CurrentUser, RequirePermissions } from '../../../common/decorators';
import { AuthUser } from '@product-catalog/shared';
import { createContext } from '../../../@core/application/use-case.interface';
import {
  GetDashboardSummaryQuery,
  GetRevenueAnalyticsQuery,
  GetInvoiceMetricsQuery,
  GetProductMetricsQuery,
  GetRecentActivityQuery,
  GetSalesMetricsQuery,
} from '../application/queries/dashboard.queries';

/**
 * Dashboard Controller
 * - SRP: Only handles dashboard HTTP concerns
 * - CQRS: Uses queries for read operations
 */
@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly getDashboardSummaryQuery: GetDashboardSummaryQuery,
    private readonly getRevenueAnalyticsQuery: GetRevenueAnalyticsQuery,
    private readonly getInvoiceMetricsQuery: GetInvoiceMetricsQuery,
    private readonly getProductMetricsQuery: GetProductMetricsQuery,
    private readonly getRecentActivityQuery: GetRecentActivityQuery,
    private readonly getSalesMetricsQuery: GetSalesMetricsQuery,
  ) {}

@Get('sales-metrics')
  @RequirePermissions('SALE_READ')
  @ApiOperation({ summary: 'Get sales and stock metrics for dashboard' })
  async getSalesMetrics(@CurrentUser() user: AuthUser) {
    const result = await this.getSalesMetricsQuery.execute({
      context: createContext(user.tenantId, user.id),
    });

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return result.value;
  }

  @Get()
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get dashboard summary' })
  async getSummary(@CurrentUser() user: AuthUser) {
    const result = await this.getDashboardSummaryQuery.execute({
      context: createContext(user.tenantId, user.id),
    });

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return result.value;
  }

  @Get('revenue')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get revenue analytics' })
  @ApiQuery({ name: 'period', required: false, enum: ['daily', 'weekly', 'monthly'] })
  @ApiQuery({ name: 'startDate', required: false })
  @ApiQuery({ name: 'endDate', required: false })
  async getRevenue(
    @CurrentUser() user: AuthUser,
    @Query('period') period?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const validPeriods = ['daily', 'weekly', 'monthly'] as const;
    const periodValue = (validPeriods.includes(period as any) ? period : 'daily') as
      | 'daily'
      | 'weekly'
      | 'monthly';

    const result = await this.getRevenueAnalyticsQuery.execute({
      context: createContext(user.tenantId, user.id),
      period: periodValue,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return result.value;
  }

  @Get('invoices')
  @RequirePermissions('INVOICE_READ')
  @ApiOperation({ summary: 'Get invoice metrics' })
  async getInvoiceMetrics(@CurrentUser() user: AuthUser) {
    const result = await this.getInvoiceMetricsQuery.execute({
      context: createContext(user.tenantId, user.id),
    });

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return result.value;
  }

  @Get('products')
  @RequirePermissions('PRODUCT_READ')
  @ApiOperation({ summary: 'Get product metrics' })
  async getProductMetrics(@CurrentUser() user: AuthUser) {
    const result = await this.getProductMetricsQuery.execute({
      context: createContext(user.tenantId, user.id),
    });

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return result.value;
  }

  @Get('activity')
  @RequirePermissions('AUDIT_READ')
  @ApiOperation({ summary: 'Get recent activity' })
  @ApiQuery({ name: 'limit', required: false })
  async getActivity(
    @CurrentUser() user: AuthUser,
    @Query('limit') limit?: string,
  ) {
    const result = await this.getRecentActivityQuery.execute({
      context: createContext(user.tenantId, user.id),
      limit: limit ? parseInt(limit, 10) : undefined,
    });

    if (result.isFailure) {
      throw new BadRequestException(result.error.message);
    }

    return result.value;
  }
}
