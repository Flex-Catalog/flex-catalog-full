import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

// Repository
import { INVOICE_REPOSITORY } from './domain/repositories/invoice.repository.interface';
import { PrismaInvoiceRepository } from './infrastructure/persistence/invoice.repository';

// Fiscal Providers
import { FISCAL_PROVIDER_REGISTRY } from './domain/services/fiscal-provider.interface';
import { BrazilFiscalProvider } from './infrastructure/fiscal-providers/brazil.provider';
import { USFiscalProvider } from './infrastructure/fiscal-providers/us.provider';
import { PortugalFiscalProvider } from './infrastructure/fiscal-providers/portugal.provider';
import { FiscalProviderRegistry } from './infrastructure/fiscal-providers/provider-registry';

// Use Cases
import {
  CreateInvoiceUseCase,
  IssueInvoiceUseCase,
  CancelInvoiceUseCase,
  GetInvoiceQuery,
  ListInvoicesQuery,
} from './application/use-cases/invoice.use-cases';

// Event Handlers
import {
  InvoiceCreatedAuditHandler,
  InvoiceIssuedAuditHandler,
  InvoiceFailedAuditHandler,
  InvoiceCanceledAuditHandler,
} from './application/event-handlers/audit-log.handler';

// Controller
import { InvoicesController } from './presentation/invoices.controller';

/**
 * Invoice Module
 * - DDD Bounded Context for Invoices
 * - High cohesion: All invoice-related functionality
 * - Low coupling: Depends only on @core and prisma
 */
@Module({
  imports: [PrismaModule],
  controllers: [InvoicesController],
  providers: [
    // Repository
    {
      provide: INVOICE_REPOSITORY,
      useClass: PrismaInvoiceRepository,
    },

    // Fiscal Providers
    BrazilFiscalProvider,
    USFiscalProvider,
    PortugalFiscalProvider,
    {
      provide: FISCAL_PROVIDER_REGISTRY,
      useClass: FiscalProviderRegistry,
    },

    // Use Cases
    CreateInvoiceUseCase,
    IssueInvoiceUseCase,
    CancelInvoiceUseCase,
    GetInvoiceQuery,
    ListInvoicesQuery,

    // Event Handlers
    InvoiceCreatedAuditHandler,
    InvoiceIssuedAuditHandler,
    InvoiceFailedAuditHandler,
    InvoiceCanceledAuditHandler,
  ],
  exports: [INVOICE_REPOSITORY, GetInvoiceQuery, ListInvoicesQuery],
})
export class InvoiceModule {}
