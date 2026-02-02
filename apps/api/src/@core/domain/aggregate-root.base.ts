import { Entity } from './entity.base';
import { DomainEvent } from './domain-event.base';

/**
 * Base Aggregate Root class
 * - SRP: Manages domain events collection
 * - Encapsulation: Events are internal, cleared after dispatch
 * - Immutability: Returns copy of events array
 */
export abstract class AggregateRoot<TId> extends Entity<TId> {
  private _domainEvents: DomainEvent[] = [];

  protected constructor(id: TId, createdAt?: Date) {
    super(id, createdAt);
  }

  /**
   * Returns a copy of domain events (immutability)
   */
  get domainEvents(): ReadonlyArray<DomainEvent> {
    return [...this._domainEvents];
  }

  /**
   * Adds a domain event to be dispatched
   * - Encapsulated: Only aggregate can add events
   */
  protected addDomainEvent(event: DomainEvent): void {
    this._domainEvents.push(event);
  }

  /**
   * Clears all domain events after they've been dispatched
   * - Called by infrastructure after persistence
   */
  clearDomainEvents(): void {
    this._domainEvents = [];
  }

  /**
   * Checks if aggregate has pending events
   * - Pure function
   */
  hasDomainEvents(): boolean {
    return this._domainEvents.length > 0;
  }
}
