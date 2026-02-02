import { SimpleValueObject } from '../value-object.base';
import { Result, ValidationError } from '../result';

/**
 * Email Value Object
 * - Immutability: Value is readonly
 * - Pure validation
 * - SRP: Only email validation and formatting
 */
export class Email extends SimpleValueObject<string> {
  private static readonly EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  private constructor(value: string) {
    super(value.toLowerCase().trim());
  }

  /**
   * Factory method with validation
   * - Pure function: Returns Result
   */
  static create(value: string): Result<Email, ValidationError> {
    if (!value || value.trim().length === 0) {
      return Result.fail(new ValidationError('Email is required', 'email'));
    }

    const normalized = value.toLowerCase().trim();

    if (!Email.EMAIL_REGEX.test(normalized)) {
      return Result.fail(new ValidationError('Invalid email format', 'email'));
    }

    if (normalized.length > 254) {
      return Result.fail(new ValidationError('Email is too long', 'email'));
    }

    return Result.ok(new Email(normalized));
  }

  /**
   * Pure function: Gets domain part
   */
  get domain(): string {
    return this._value.split('@')[1];
  }

  /**
   * Pure function: Gets local part (before @)
   */
  get localPart(): string {
    return this._value.split('@')[0];
  }
}
