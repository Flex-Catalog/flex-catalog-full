import { randomUUID } from 'crypto';

/**
 * Base Domain Event class
 * - Immutability: All properties are readonly
 * - SRP: Only carries event data
 * - Pure: No side effects
 */
export abstract class DomainEvent {
  readonly eventId: string;
  readonly occurredAt: Date;
  readonly aggregateId: string;
  readonly eventType: string;

  protected constructor(aggregateId: string) {
    this.eventId = randomUUID();
    this.occurredAt = new Date();
    this.aggregateId = aggregateId;
    this.eventType = this.constructor.name;
  }

  /**
   * Pure function: Converts event to plain object for serialization
   */
  abstract toPrimitives(): Record<string, unknown>;
}

/**
 * Interface for domain event handlers
 * - SRP: Single method for handling
 * - Dependency Inversion: Depends on abstraction
 */
export interface IDomainEventHandler<T extends DomainEvent> {
  handle(event: T): Promise<void>;
}

/**
 * Interface for event bus
 * - SRP: Only publishes events
 * - Dependency Inversion: Abstract interface
 */
export interface IEventBus {
  publish(event: DomainEvent): Promise<void>;
  publishAll(events: DomainEvent[]): Promise<void>;
}
