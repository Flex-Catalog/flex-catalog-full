import { ValueObject } from '../value-object.base';
import { Result, ValidationError } from '../result';

/**
 * Money Value Object
 * - Immutability: All operations return new instances
 * - Pure functions: No side effects
 * - SRP: Only monetary calculations
 */
interface MoneyProps {
  readonly amountInCents: number;
  readonly currency: string;
}

const SUPPORTED_CURRENCIES = ['BRL', 'USD', 'EUR'] as const;
type Currency = (typeof SUPPORTED_CURRENCIES)[number];

export class Money extends ValueObject<MoneyProps> {
  private constructor(props: MoneyProps) {
    super(props);
  }

  get amountInCents(): number {
    return this.props.amountInCents;
  }

  get currency(): string {
    return this.props.currency;
  }

  /**
   * Pure function: Returns amount in decimal format
   */
  get amount(): number {
    return this.props.amountInCents / 100;
  }

  /**
   * Factory method with validation
   * - Returns Result instead of throwing
   */
  static create(amountInCents: number, currency: string): Result<Money, ValidationError> {
    if (!Number.isInteger(amountInCents)) {
      return Result.fail(new ValidationError('Amount must be an integer (cents)', 'amountInCents'));
    }
    if (amountInCents < 0) {
      return Result.fail(new ValidationError('Amount cannot be negative', 'amountInCents'));
    }
    if (!SUPPORTED_CURRENCIES.includes(currency as Currency)) {
      return Result.fail(
        new ValidationError(`Currency must be one of: ${SUPPORTED_CURRENCIES.join(', ')}`, 'currency'),
      );
    }
    return Result.ok(new Money({ amountInCents, currency }));
  }

  /**
   * Factory for zero amount
   */
  static zero(currency: string): Result<Money, ValidationError> {
    return Money.create(0, currency);
  }

  /**
   * Factory from decimal amount
   */
  static fromDecimal(amount: number, currency: string): Result<Money, ValidationError> {
    const cents = Math.round(amount * 100);
    return Money.create(cents, currency);
  }

  /**
   * Pure function: Adds two money values
   * - Returns new instance (immutability)
   */
  add(other: Money): Result<Money, ValidationError> {
    if (this.currency !== other.currency) {
      return Result.fail(new ValidationError('Cannot add money with different currencies'));
    }
    return Money.create(this.amountInCents + other.amountInCents, this.currency);
  }

  /**
   * Pure function: Subtracts money value
   */
  subtract(other: Money): Result<Money, ValidationError> {
    if (this.currency !== other.currency) {
      return Result.fail(new ValidationError('Cannot subtract money with different currencies'));
    }
    const result = this.amountInCents - other.amountInCents;
    if (result < 0) {
      return Result.fail(new ValidationError('Result cannot be negative'));
    }
    return Money.create(result, this.currency);
  }

  /**
   * Pure function: Multiplies by quantity
   */
  multiply(quantity: number): Result<Money, ValidationError> {
    if (quantity < 0) {
      return Result.fail(new ValidationError('Quantity cannot be negative'));
    }
    const result = Math.round(this.amountInCents * quantity);
    return Money.create(result, this.currency);
  }

  /**
   * Pure function: Checks if greater than other
   */
  isGreaterThan(other: Money): boolean {
    return this.currency === other.currency && this.amountInCents > other.amountInCents;
  }

  /**
   * Pure function: Checks if less than other
   */
  isLessThan(other: Money): boolean {
    return this.currency === other.currency && this.amountInCents < other.amountInCents;
  }

  /**
   * Pure function: Checks if zero
   */
  isZero(): boolean {
    return this.amountInCents === 0;
  }

  /**
   * Pure function: Formats as locale string
   */
  format(locale = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: this.currency,
    }).format(this.amount);
  }

  toPrimitives(): MoneyProps {
    return { ...this.props };
  }
}
