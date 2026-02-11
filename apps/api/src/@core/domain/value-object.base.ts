/**
 * Base Value Object class
 * - Immutability: All properties must be readonly
 * - Equality: Based on structural equality, not identity
 * - SRP: Only handles value semantics
 * - Pure: No side effects
 */
export abstract class ValueObject<T> {
  protected readonly props: Readonly<T>;

  protected constructor(props: T) {
    this.props = Object.freeze({ ...props });
  }

  /**
   * Pure function: Structural equality check
   */
  equals(other: ValueObject<T> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    if (this === other) {
      return true;
    }
    return this.equalsCore(other);
  }

  /**
   * Template method for subclass-specific equality
   * - Open/Closed: Extendable by subclasses
   */
  protected equalsCore(other: ValueObject<T>): boolean {
    return JSON.stringify(this.props) === JSON.stringify(other.props);
  }

  /**
   * Pure function: Returns primitive representation
   */
  abstract toPrimitives(): T;

  /**
   * Pure function: Creates a copy with modified properties
   * - Immutability: Returns new instance
   */
  protected copyWith(props: Partial<T>): T {
    return { ...this.props, ...props } as T;
  }
}

/**
 * Simple Value Object for single-value types
 * - DRY: Reusable base for simple VOs
 */
export abstract class SimpleValueObject<T> {
  protected readonly _value: T;

  protected constructor(value: T) {
    this._value = value;
  }

  get value(): T {
    return this._value;
  }

  equals(other: SimpleValueObject<T> | null | undefined): boolean {
    if (other === null || other === undefined) {
      return false;
    }
    return this._value === other._value;
  }

  toString(): string {
    return String(this._value);
  }
}
