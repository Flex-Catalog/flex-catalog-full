import { SimpleValueObject } from '../../../../@core/domain/value-object.base';
import { Result, ValidationError } from '../../../../@core/domain/result';

/**
 * SKU Value Object
 * - Immutability
 * - Pure validation
 * - SRP: Only SKU logic
 */
export class SKU extends SimpleValueObject<string> {
  private static readonly SKU_REGEX = /^[A-Z0-9][A-Z0-9\-_]{0,63}$/;

  private constructor(value: string) {
    super(value);
  }

  /**
   * Factory with validation
   * - Normalizes to uppercase
   * - Allows alphanumeric, hyphens, underscores
   */
  static create(value: string): Result<SKU, ValidationError> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('SKU is required', 'sku'));
    }

    const normalized = value.trim().toUpperCase();

    if (normalized.length > 64) {
      return Result.fail(new ValidationError('SKU must be 64 characters or less', 'sku'));
    }

    if (!SKU.SKU_REGEX.test(normalized)) {
      return Result.fail(
        new ValidationError(
          'SKU must start with alphanumeric and contain only letters, numbers, hyphens, and underscores',
          'sku',
        ),
      );
    }

    return Result.ok(new SKU(normalized));
  }

  /**
   * Factory for auto-generated SKU
   */
  static generate(prefix: string = 'SKU'): SKU {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return new SKU(`${prefix}-${timestamp}-${random}`);
  }

  /**
   * Factory from trusted source
   */
  static fromTrusted(value: string): SKU {
    return new SKU(value);
  }
}
