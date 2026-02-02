import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

// Queries
import {
  GetDashboardSummaryQuery,
  GetRevenueAnalyticsQuery,
  GetInvoiceMetricsQuery,
  GetProductMetricsQuery,
  GetRecentActivityQuery,
} from './application/queries/dashboard.queries';

// Controller
import { DashboardController } from './presentation/dashboard.controller';

/**
 * Analytics Module
 * - CQRS Read Side for Dashboard and Reporting
 * - High cohesion: All analytics queries
 * - Low coupling: Only depends on @core and prisma
 */
@Module({
  imports: [PrismaModule],
  controllers: [DashboardController],
  providers: [
    GetDashboardSummaryQuery,
    GetRevenueAnalyticsQuery,
    GetInvoiceMetricsQuery,
    GetProductMetricsQuery,
    GetRecentActivityQuery,
  ],
  exports: [
    GetDashboardSummaryQuery,
    GetRevenueAnalyticsQuery,
    GetInvoiceMetricsQuery,
    GetProductMetricsQuery,
    GetRecentActivityQuery,
  ],
})
export class AnalyticsModule {}
