import { DomainEvent } from '../../../../@core/domain/domain-event.base';

/**
 * Category Created Event
 */
export class CategoryCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly name: string,
    readonly parentId: string | null,
    readonly createdById: string,
  ) {
    super(aggregateId);
  }

  toPrimitives(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      tenantId: this.tenantId,
      name: this.name,
      parentId: this.parentId,
      createdById: this.createdById,
    };
  }
}

/**
 * Category Updated Event
 */
export class CategoryUpdatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly changes: Record<string, { old: unknown; new: unknown }>,
    readonly updatedById: string,
  ) {
    super(aggregateId);
  }

  toPrimitives(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      tenantId: this.tenantId,
      changes: this.changes,
      updatedById: this.updatedById,
    };
  }
}

/**
 * Category Deleted Event
 */
export class CategoryDeletedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly categoryName: string,
    readonly deletedById: string,
  ) {
    super(aggregateId);
  }

  toPrimitives(): Record<string, unknown> {
    return {
      eventId: this.eventId,
      eventType: this.eventType,
      occurredAt: this.occurredAt.toISOString(),
      aggregateId: this.aggregateId,
      tenantId: this.tenantId,
      categoryName: this.categoryName,
      deletedById: this.deletedById,
    };
  }
}
