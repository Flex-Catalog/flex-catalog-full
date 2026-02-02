import { Global, Module } from '@nestjs/common';
import { InMemoryEventBus, EVENT_BUS } from './event-bus';
import { IEventBus } from '../../domain/domain-event.base';

/**
 * Event Bus Module
 * - Global: Available across all modules
 * - Provides IEventBus abstraction
 */
@Global()
@Module({
  providers: [
    InMemoryEventBus,
    {
      provide: EVENT_BUS,
      useExisting: InMemoryEventBus,
    },
  ],
  exports: [EVENT_BUS, InMemoryEventBus],
})
export class EventBusModule {}

/**
 * Helper type for injecting event bus
 */
export type EventBusProvider = IEventBus;
