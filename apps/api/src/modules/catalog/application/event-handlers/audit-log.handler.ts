import { Injectable } from '@nestjs/common';
import { IDomainEventHandler } from '../../../../@core/domain/domain-event.base';
import { EventHandler } from '../../../../@core/infrastructure/event-bus';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
} from '../../domain/events/product.events';
import {
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
  CategoryDeletedEvent,
} from '../../domain/events/category.events';

/**
 * Audit Log Handler for Catalog Events
 * - SRP: Only handles audit logging
 * - Event-driven: Reacts to domain events
 */
@Injectable()
@EventHandler(ProductCreatedEvent)
export class ProductCreatedAuditHandler implements IDomainEventHandler<ProductCreatedEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: ProductCreatedEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.createdById,
        action: 'CREATE',
        entity: 'Product',
        entityId: event.aggregateId,
        entityName: event.name,
        newData: event.toPrimitives() as any,
        createdAt: event.occurredAt,
      },
    });
  }
}

@Injectable()
@EventHandler(ProductUpdatedEvent)
export class ProductUpdatedAuditHandler implements IDomainEventHandler<ProductUpdatedEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: ProductUpdatedEvent): Promise<void> {
    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(event.changes)) {
      oldData[key] = value.old;
      newData[key] = value.new;
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.updatedById,
        action: 'UPDATE',
        entity: 'Product',
        entityId: event.aggregateId,
        oldData: oldData as any,
        newData: newData as any,
        createdAt: event.occurredAt,
      },
    });
  }
}

@Injectable()
@EventHandler(ProductDeletedEvent)
export class ProductDeletedAuditHandler implements IDomainEventHandler<ProductDeletedEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: ProductDeletedEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.deletedById,
        action: 'DELETE',
        entity: 'Product',
        entityId: event.aggregateId,
        entityName: event.productName,
        oldData: { name: event.productName } as any,
        createdAt: event.occurredAt,
      },
    });
  }
}

@Injectable()
@EventHandler(CategoryCreatedEvent)
export class CategoryCreatedAuditHandler implements IDomainEventHandler<CategoryCreatedEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: CategoryCreatedEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.createdById,
        action: 'CREATE',
        entity: 'Category',
        entityId: event.aggregateId,
        entityName: event.name,
        newData: event.toPrimitives() as any,
        createdAt: event.occurredAt,
      },
    });
  }
}

@Injectable()
@EventHandler(CategoryUpdatedEvent)
export class CategoryUpdatedAuditHandler implements IDomainEventHandler<CategoryUpdatedEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: CategoryUpdatedEvent): Promise<void> {
    const oldData: Record<string, unknown> = {};
    const newData: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(event.changes)) {
      oldData[key] = value.old;
      newData[key] = value.new;
    }

    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.updatedById,
        action: 'UPDATE',
        entity: 'Category',
        entityId: event.aggregateId,
        oldData: oldData as any,
        newData: newData as any,
        createdAt: event.occurredAt,
      },
    });
  }
}

@Injectable()
@EventHandler(CategoryDeletedEvent)
export class CategoryDeletedAuditHandler implements IDomainEventHandler<CategoryDeletedEvent> {
  constructor(private readonly prisma: PrismaService) {}

  async handle(event: CategoryDeletedEvent): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        tenantId: event.tenantId,
        userId: event.deletedById,
        action: 'DELETE',
        entity: 'Category',
        entityId: event.aggregateId,
        entityName: event.categoryName,
        oldData: { name: event.categoryName } as any,
        createdAt: event.occurredAt,
      },
    });
  }
}
