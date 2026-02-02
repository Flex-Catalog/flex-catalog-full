import { DomainEvent } from '../../../../@core/domain/domain-event.base';

/**
 * Product Created Event
 * - Immutable event data
 */
export class ProductCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly name: string,
    readonly sku: string | null,
    readonly priceCents: number,
    readonly currency: string,
    readonly categoryId: string | null,
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
      sku: this.sku,
      priceCents: this.priceCents,
      currency: this.currency,
      categoryId: this.categoryId,
      createdById: this.createdById,
    };
  }
}

/**
 * Product Updated Event
 */
export class ProductUpdatedEvent extends DomainEvent {
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
 * Product Deleted Event
 */
export class ProductDeletedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly productName: string,
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
      productName: this.productName,
      deletedById: this.deletedById,
    };
  }
}

/**
 * Product Activated Event
 */
export class ProductActivatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly activatedById: string,
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
      activatedById: this.activatedById,
    };
  }
}

/**
 * Product Deactivated Event
 */
export class ProductDeactivatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly deactivatedById: string,
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
      deactivatedById: this.deactivatedById,
    };
  }
}
