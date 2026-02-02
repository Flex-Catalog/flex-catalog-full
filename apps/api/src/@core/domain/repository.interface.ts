import { AggregateRoot } from './aggregate-root.base';
import { Result } from './result';

/**
 * Generic Repository interface
 * - Dependency Inversion: Domain depends on abstraction
 * - SRP: Only persistence operations
 * - Interface Segregation: Minimal interface
 */
export interface IRepository<T extends AggregateRoot<TId>, TId = string> {
  findById(id: TId): Promise<Result<T, Error>>;
  save(aggregate: T): Promise<Result<void, Error>>;
  delete(id: TId): Promise<Result<void, Error>>;
}

/**
 * Query options for list operations
 * - Immutability: All properties readonly
 */
export interface QueryOptions {
  readonly page: number;
  readonly limit: number;
  readonly sortBy?: string;
  readonly sortOrder?: 'asc' | 'desc';
}

/**
 * Paginated result
 * - Immutability: All properties readonly
 */
export interface PaginatedResult<T> {
  readonly data: readonly T[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

/**
 * Creates paginated result - Pure function
 */
export function createPaginatedResult<T>(
  data: T[],
  total: number,
  options: QueryOptions,
): PaginatedResult<T> {
  return Object.freeze({
    data: Object.freeze([...data]),
    total,
    page: options.page,
    limit: options.limit,
    totalPages: Math.ceil(total / options.limit),
  });
}

/**
 * Repository with list capability
 * - Interface Segregation: Extended interface for list
 */
export interface IListableRepository<T extends AggregateRoot<TId>, TId = string>
  extends IRepository<T, TId> {
  findAll(options: QueryOptions): Promise<Result<PaginatedResult<T>, Error>>;
}

/**
 * Unit of Work pattern
 * - SRP: Manages transaction boundaries
 */
export interface IUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
}
