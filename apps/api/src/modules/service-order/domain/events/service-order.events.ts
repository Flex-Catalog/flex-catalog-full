import { DomainEvent } from '../../../../@core/domain/domain-event.base';

export class ServiceOrderCreatedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly orderNumber: string,
    readonly companyName: string,
    readonly vesselName: string,
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
      orderNumber: this.orderNumber,
      companyName: this.companyName,
      vesselName: this.vesselName,
      createdById: this.createdById,
    };
  }
}

export class ServiceOrderCompletedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly orderNumber: string,
    readonly totalCents: number,
    readonly completedById: string,
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
      orderNumber: this.orderNumber,
      totalCents: this.totalCents,
      completedById: this.completedById,
    };
  }
}

export class ServiceOrderCanceledEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly orderNumber: string,
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
      orderNumber: this.orderNumber,
      canceledById: this.canceledById,
    };
  }
}

export class ServiceInvoiceGeneratedEvent extends DomainEvent {
  constructor(
    aggregateId: string,
    readonly tenantId: string,
    readonly orderNumber: string,
    readonly invoiceType: string,
    readonly generatedById: string,
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
      orderNumber: this.orderNumber,
      invoiceType: this.invoiceType,
      generatedById: this.generatedById,
    };
  }
}
