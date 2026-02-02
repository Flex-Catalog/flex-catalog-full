import { Injectable } from '@nestjs/common';
import { IDomainEventHandler } from '../../../../@core/domain/domain-event.base';
import { EventHandler } from '../../../../@core/infrastructure/event-bus';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  InvoiceCreatedEvent,
  InvoiceIssuedEvent,
  InvoiceFailedEvent,
  InvoiceCanceledEvent,
} from '../../domain/events/invoice.events';

/**
 * Audit Log Handler for Invoice Events
 */
@Injectable()
@EventHandler(InvoiceCreatedEvent)
export class InvoiceCreatedAuditHandler implements IDomainEventHandler<InvoiceCreatedEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: InvoiceCreatedEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.createdById,
        action: 'CREATE',
        entity: 'Invoice',
        entityId: event.aggregateId,
        entityName: `Invoice ${event.country} - ${event.customerName}`,
        newData: event.toPrimitives() as any,
        createdAt: event.occurredAt,
      },
    });
  }
}

@Injectable()
@EventHandler(InvoiceIssuedEvent)
export class InvoiceIssuedAuditHandler implements IDomainEventHandler<InvoiceIssuedEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: InvoiceIssuedEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.issuedById,
        action: 'ISSUE',
        entity: 'Invoice',
        entityId: event.aggregateId,
        entityName: `Invoice ${event.country} - ${event.customerName}`,
        oldData: { status: 'PENDING' } as any,
        newData: { status: 'ISSUED', result: event.fiscalResult } as any,
        createdAt: event.occurredAt,
      },
    });
  }
}

@Injectable()
@EventHandler(InvoiceFailedEvent)
export class InvoiceFailedAuditHandler implements IDomainEventHandler<InvoiceFailedEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: InvoiceFailedEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.userId,
        action: 'UPDATE',
        entity: 'Invoice',
        entityId: event.aggregateId,
        oldData: { status: 'PENDING' } as any,
        newData: { status: 'FAILED', error: event.errorMessage } as any,
        createdAt: event.occurredAt,
      },
    });
  }
}

@Injectable()
@EventHandler(InvoiceCanceledEvent)
export class InvoiceCanceledAuditHandler implements IDomainEventHandler<InvoiceCanceledEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: InvoiceCanceledEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.canceledById,
        action: 'CANCEL',
        entity: 'Invoice',
        entityId: event.aggregateId,
        entityName: `Invoice - ${event.customerName}`,
        newData: { status: 'CANCELED' } as any,
        createdAt: event.occurredAt,
      },
    });
  }
}
