/**
 * Result monad for functional error handling
 * - Immutability: All properties readonly
 * - Pure functions: No side effects
 * - SRP: Only handles success/failure states
 */
export class Result<T, E = Error> {
  private readonly _isSuccess: boolean;
  private readonly _value?: T;
  private readonly _error?: E;

  private constructor(isSuccess: boolean, value?: T, error?: E) {
    this._isSuccess = isSuccess;
    this._value = value;
    this._error = error;
    Object.freeze(this);
  }

  get isSuccess(): boolean {
    return this._isSuccess;
  }

  get isFailure(): boolean {
    return !this._isSuccess;
  }

  /**
   * Gets the value or throws if failure
   * - Use only when you're certain of success
   */
  get value(): T {
    if (!this._isSuccess) {
      throw new Error('Cannot get value of a failed result');
    }
    return this._value as T;
  }

  /**
   * Gets the error or throws if success
   */
  get error(): E {
    if (this._isSuccess) {
      throw new Error('Cannot get error of a successful result');
    }
    return this._error as E;
  }

  /**
   * Safe value access with default
   * - Pure function
   */
  getOrElse(defaultValue: T): T {
    return this._isSuccess ? (this._value as T) : defaultValue;
  }

  /**
   * Maps the success value
   * - Pure function: Returns new Result
   */
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this._isSuccess) {
      return Result.ok(fn(this._value as T));
    }
    return Result.fail(this._error as E);
  }

  /**
   * Flat maps the success value
   * - Pure function: Returns new Result
   */
  flatMap<U>(fn: (value: T) => Result<U, E>): Result<U, E> {
    if (this._isSuccess) {
      return fn(this._value as T);
    }
    return Result.fail(this._error as E);
  }

  /**
   * Maps the error value
   * - Pure function
   */
  mapError<F>(fn: (error: E) => F): Result<T, F> {
    if (this._isSuccess) {
      return Result.ok(this._value as T);
    }
    return Result.fail(fn(this._error as E));
  }

  /**
   * Executes callback on success
   * - Returns this for chaining
   */
  onSuccess(fn: (value: T) => void): this {
    if (this._isSuccess) {
      fn(this._value as T);
    }
    return this;
  }

  /**
   * Executes callback on failure
   * - Returns this for chaining
   */
  onFailure(fn: (error: E) => void): this {
    if (!this._isSuccess) {
      fn(this._error as E);
    }
    return this;
  }

  /**
   * Pattern matching
   * - Pure function
   */
  match<U>(handlers: { success: (value: T) => U; failure: (error: E) => U }): U {
    return this._isSuccess
      ? handlers.success(this._value as T)
      : handlers.failure(this._error as E);
  }

  /**
   * Factory: Creates a successful result
   */
  static ok<T, E = Error>(value: T): Result<T, E> {
    return new Result<T, E>(true, value);
  }

  /**
   * Factory: Creates a failed result
   */
  static fail<T, E = Error>(error: E): Result<T, E> {
    return new Result<T, E>(false, undefined, error);
  }

  /**
   * Factory: Creates a void success result
   */
  static void<E = Error>(): Result<void, E> {
    return new Result<void, E>(true, undefined);
  }

  /**
   * Combines multiple results
   * - Returns first failure or all successes
   * - Pure function
   */
  static combine<T, E = Error>(results: Result<T, E>[]): Result<T[], E> {
    const values: T[] = [];
    for (const result of results) {
      if (result.isFailure) {
        return Result.fail(result.error);
      }
      values.push(result.value);
    }
    return Result.ok(values);
  }

  /**
   * Wraps a function that may throw
   * - Converts exceptions to Result
   */
  static fromTry<T>(fn: () => T): Result<T, Error> {
    try {
      return Result.ok(fn());
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Wraps an async function that may throw
   */
  static async fromTryAsync<T>(fn: () => Promise<T>): Promise<Result<T, Error>> {
    try {
      const value = await fn();
      return Result.ok(value);
    } catch (error) {
      return Result.fail(error instanceof Error ? error : new Error(String(error)));
    }
  }
}

/**
 * Domain-specific error types
 * - SRP: Each error has single purpose
 */
export class DomainError extends Error {
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.code = code;
    this.name = 'DomainError';
  }
}

export class ValidationError extends DomainError {
  readonly field?: string;

  constructor(message: string, field?: string) {
    super('VALIDATION_ERROR', message);
    this.field = field;
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends DomainError {
  constructor(entity: string, id?: string) {
    super('NOT_FOUND', id ? `${entity} with id ${id} not found` : `${entity} not found`);
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends DomainError {
  constructor(message: string) {
    super('CONFLICT', message);
    this.name = 'ConflictError';
  }
}

export class UnauthorizedError extends DomainError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends DomainError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message);
    this.name = 'ForbiddenError';
  }
}
