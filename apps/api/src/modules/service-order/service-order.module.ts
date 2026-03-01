import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../prisma/prisma.module';

import {
  SERVICE_ORDER_REPOSITORY,
  PrismaServiceOrderRepository,
} from './infrastructure/persistence/service-order.repository';
import { PdfGeneratorService } from './infrastructure/documents/pdf-generator.service';
import { FocusNfeService } from './infrastructure/fiscal/focus-nfe.service';
import { ServiceOrdersController } from './presentation/service-orders.controller';

/**
 * Service Order Module
 * - DDD Bounded Context for Service Orders
 * - Handles: creation, tracking, completion, receipt/invoice generation
 */
@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [ServiceOrdersController],
  providers: [
    {
      provide: SERVICE_ORDER_REPOSITORY,
      useClass: PrismaServiceOrderRepository,
    },
    PdfGeneratorService,
    FocusNfeService,
  ],
  exports: [SERVICE_ORDER_REPOSITORY, PdfGeneratorService, FocusNfeService],
})
export class ServiceOrderModule {}
