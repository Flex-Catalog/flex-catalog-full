import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD, APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';

// Core DDD Infrastructure
import { CoreModule } from './@core/core.module';

// Legacy Modules (keeping auth, users, tenants, billing, uploads for now)
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { TenantsModule } from './tenants/tenants.module';
import { BillingModule } from './billing/billing.module';
import { UploadsModule } from './uploads/uploads.module';
import { AuditModule } from './audit/audit.module';

// DDD Bounded Contexts
import { CatalogModule } from './modules/catalog/catalog.module';
import { InvoiceModule } from './modules/invoice/invoice.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ServiceOrderModule } from './modules/service-order/service-order.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { TenantStatusGuard } from './common/guards/tenant-status.guard';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    // Core Infrastructure
    CoreModule,
    PrismaModule,

    // Auth & Identity (legacy for now)
    AuthModule,
    UsersModule,
    TenantsModule,

    // DDD Bounded Contexts
    CatalogModule, // Products + Categories
    InvoiceModule, // Invoices + Fiscal Providers
    AnalyticsModule, // Dashboard + Reports
    ServiceOrderModule, // Service Orders + Receipts + NFS-e

    // Supporting Modules
    BillingModule,
    UploadsModule,
    AuditModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: TenantStatusGuard,
    },
    {
      provide: APP_FILTER,
      useClass: HttpExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
})
export class AppModule {}
