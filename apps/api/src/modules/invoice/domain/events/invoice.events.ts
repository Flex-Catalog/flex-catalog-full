import { DomainEvent } from '../../../../@core/domain/domain-event.base';

/**
 * Invoice Created Event
 */
export class InvoiceCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly country: string,
    readonly customerName: string,
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
      country: this.country,
      customerName: this.customerName,
      createdById: this.createdById,
    };
  }
}

/**
 * Invoice Issued Event
 */
export class InvoiceIssuedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly country: string,
    readonly customerName: string,
    readonly issuedById: string,
    readonly fiscalResult: Record<string, unknown>,
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
      country: this.country,
      customerName: this.customerName,
      issuedById: this.issuedById,
      fiscalResult: this.fiscalResult,
    };
  }
}

/**
 * Invoice Failed Event
 */
export class InvoiceFailedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly errorMessage: string,
    readonly userId: string,
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
      errorMessage: this.errorMessage,
      userId: this.userId,
    };
  }
}

/**
 * Invoice Canceled Event
 */
export class InvoiceCanceledEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly customerName: string,
    readonly canceledById: string,
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
      customerName: this.customerName,
      canceledById: this.canceledById,
    };
  }
}
