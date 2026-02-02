import { Result } from '../domain/result';

/**
 * Base Use Case interface
 * - SRP: Single operation per use case
 * - Dependency Inversion: Depends on abstractions
 * - Pure: Returns Result instead of throwing
 */
export interface IUseCase<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput, Error>>;
}

/**
 * Use case without input
 */
export interface IUseCaseNoInput<TOutput> {
  execute(): Promise<Result<TOutput, Error>>;
}

/**
 * Use case without output
 */
export interface IUseCaseNoOutput<TInput> {
  execute(input: TInput): Promise<Result<void, Error>>;
}

/**
 * Query interface for CQRS
 * - SRP: Only reads data
 */
export interface IQuery<TInput, TOutput> {
  execute(input: TInput): Promise<Result<TOutput, Error>>;
}

/**
 * Command interface for CQRS
 * - SRP: Only writes data
 */
export interface ICommand<TInput, TOutput = void> {
  execute(input: TInput): Promise<Result<TOutput, Error>>;
}

/**
 * Base context for use cases
 * - Carries cross-cutting concerns
 */
export interface UseCaseContext {
  readonly tenantId: string;
  readonly userId: string;
  readonly correlationId?: string;
}

/**
 * Creates use case context - Pure function
 */
export function createContext(
  tenantId: string,
  userId: string,
  correlationId?: string,
): UseCaseContext {
  return Object.freeze({ tenantId, userId, correlationId });
}
