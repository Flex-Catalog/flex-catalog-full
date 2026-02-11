import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';

import {
  SERVICE_ORDER_REPOSITORY,
  PrismaServiceOrderRepository,
} from './infrastructure/persistence/service-order.repository';
import { PdfGeneratorService } from './infrastructure/documents/pdf-generator.service';
import { ServiceOrdersController } from './presentation/service-orders.controller';

/**
 * Service Order Module
 * - DDD Bounded Context for Service Orders
 * - Handles: creation, tracking, completion, receipt/invoice generation
 */
@Module({
  imports: [PrismaModule],
  controllers: [ServiceOrdersController],
  providers: [
    {
      provide: SERVICE_ORDER_REPOSITORY,
      useClass: PrismaServiceOrderRepository,
    },
    PdfGeneratorService,
  ],
  exports: [SERVICE_ORDER_REPOSITORY, PdfGeneratorService],
})
export class ServiceOrderModule {}
