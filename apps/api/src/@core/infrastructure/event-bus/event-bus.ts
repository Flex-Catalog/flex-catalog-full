import { Injectable, OnModuleInit, Type } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { DomainEvent, IDomainEventHandler, IEventBus } from '../../domain/domain-event.base';

/**
 * Event Handler Registry
 * - SRP: Only manages handler registration
 * - DRY: Single source for handler lookup
 */
type EventHandlerConstructor = Type<IDomainEventHandler<DomainEvent>>;

const EVENT_HANDLERS = new Map<string, EventHandlerConstructor[]>();

/**
 * Decorator for event handlers
 * - Clean registration mechanism
 */
export function EventHandler<T extends DomainEvent>(eventClass: Type<T>) {
  return function (target: EventHandlerConstructor) {
    const eventName = eventClass.name;
    const handlers = EVENT_HANDLERS.get(eventName) ?? [];
    handlers.push(target);
    EVENT_HANDLERS.set(eventName, handlers);
  };
}

/**
 * In-Memory Event Bus Implementation
 * - SRP: Only dispatches events
 * - Dependency Inversion: Implements IEventBus interface
 * - Law of Demeter: Delegates to handlers
 */
@Injectable()
export class InMemoryEventBus implements IEventBus, OnModuleInit {
  private handlers = new Map<string, IDomainEventHandler<DomainEvent>[]>();

  constructor(private readonly moduleRef: ModuleRef) {}

  async onModuleInit() {
    await this.registerHandlers();
  }

  private async registerHandlers(): Promise<void> {
    for (const [eventName, handlerClasses] of EVENT_HANDLERS.entries()) {
      const instances: IDomainEventHandler<DomainEvent>[] = [];

      for (const handlerClass of handlerClasses) {
        try {
          const handler = await this.moduleRef.resolve(handlerClass);
          instances.push(handler);
        } catch {
          // Handler not available in this context
        }
      }

      if (instances.length > 0) {
        this.handlers.set(eventName, instances);
      }
    }
  }

  /**
   * Publishes a single event
   * - Async: Non-blocking
   * - Fault-tolerant: Continues on handler failure
   */
  async publish(event: DomainEvent): Promise<void> {
    const eventName = event.eventType;
    const handlers = this.handlers.get(eventName) ?? [];

    const promises = handlers.map((handler) =>
      handler.handle(event).catch((error) => {
        console.error(`Error handling event ${eventName}:`, error);
      }),
    );

    await Promise.all(promises);
  }

  /**
   * Publishes multiple events in order
   */
  async publishAll(events: DomainEvent[]): Promise<void> {
    for (const event of events) {
      await this.publish(event);
    }
  }
}

/**
 * Event Bus Provider Token
 */
export const EVENT_BUS = Symbol('EVENT_BUS');
