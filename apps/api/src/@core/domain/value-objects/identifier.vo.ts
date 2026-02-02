import { SimpleValueObject } from '../value-object.base';
import { Result, ValidationError } from '../result';
import { randomUUID } from 'crypto';

/**
 * Base Identifier Value Object
 * - Type safety for IDs
 * - Immutability
 * - Pure validation
 */
abstract class Identifier extends SimpleValueObject<string> {
  protected constructor(value: string) {
    super(value);
  }

  /**
   * Pure function: Validates MongoDB ObjectId format
   */
  protected static isValidObjectId(value: string): boolean {
    return /^[0-9a-fA-F]{24}$/.test(value);
  }

  /**
   * Pure function: Validates UUID format
   */
  protected static isValidUuid(value: string): boolean {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
  }
}

/**
 * Tenant ID Value Object
 * - Type-safe tenant identifier
 */
export class TenantId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<TenantId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('Tenant ID is required', 'tenantId'));
    }

    if (!Identifier.isValidObjectId(value)) {
      return Result.fail(new ValidationError('Invalid Tenant ID format', 'tenantId'));
    }

    return Result.ok(new TenantId(value));
  }

  /**
   * Creates from trusted source (internal use)
   */
  static fromTrusted(value: string): TenantId {
    return new TenantId(value);
  }
}

/**
 * User ID Value Object
 * - Type-safe user identifier
 */
export class UserId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<UserId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('User ID is required', 'userId'));
    }

    if (!Identifier.isValidObjectId(value)) {
      return Result.fail(new ValidationError('Invalid User ID format', 'userId'));
    }

    return Result.ok(new UserId(value));
  }

  static fromTrusted(value: string): UserId {
    return new UserId(value);
  }
}

/**
 * Product ID Value Object
 */
export class ProductId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<ProductId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('Product ID is required', 'productId'));
    }

    if (!Identifier.isValidObjectId(value)) {
      return Result.fail(new ValidationError('Invalid Product ID format', 'productId'));
    }

    return Result.ok(new ProductId(value));
  }

  static fromTrusted(value: string): ProductId {
    return new ProductId(value);
  }
}

/**
 * Category ID Value Object
 */
export class CategoryId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<CategoryId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('Category ID is required', 'categoryId'));
    }

    if (!Identifier.isValidObjectId(value)) {
      return Result.fail(new ValidationError('Invalid Category ID format', 'categoryId'));
    }

    return Result.ok(new CategoryId(value));
  }

  static fromTrusted(value: string): CategoryId {
    return new CategoryId(value);
  }
}

/**
 * Invoice ID Value Object
 */
export class InvoiceId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  static create(value: string): Result<InvoiceId, ValidationError> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('Invoice ID is required', 'invoiceId'));
    }

    if (!Identifier.isValidObjectId(value)) {
      return Result.fail(new ValidationError('Invalid Invoice ID format', 'invoiceId'));
    }

    return Result.ok(new InvoiceId(value));
  }

  static fromTrusted(value: string): InvoiceId {
    return new InvoiceId(value);
  }
}

/**
 * Correlation ID for request tracing
 */
export class CorrelationId extends Identifier {
  private constructor(value: string) {
    super(value);
  }

  static create(value?: string): CorrelationId {
    return new CorrelationId(value ?? randomUUID());
  }

  static generate(): CorrelationId {
    return new CorrelationId(randomUUID());
  }
}
