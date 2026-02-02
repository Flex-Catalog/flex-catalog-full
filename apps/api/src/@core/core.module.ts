import { Global, Module } from '@nestjs/common';
import { EventBusModule } from './infrastructure/event-bus';

/**
 * Core Module
 * - DDD shared kernel
 * - Global: Available across all modules
 */
@Global()
@Module({
  imports: [EventBusModule],
  exports: [EventBusModule],
})
export class CoreModule {}
