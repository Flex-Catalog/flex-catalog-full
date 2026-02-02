import { SimpleValueObject } from '../../../../@core/domain/value-object.base';
import { Result, ValidationError } from '../../../../@core/domain/result';

/**
 * Invoice Status Value Object
 * - Immutable
 * - Encapsulates status transitions
 */
export const INVOICE_STATUSES = ['DRAFT', 'PENDING', 'ISSUED', 'FAILED', 'CANCELED'] as const;
export type InvoiceStatusValue = (typeof INVOICE_STATUSES)[number];

export class InvoiceStatus extends SimpleValueObject<InvoiceStatusValue> {
  private constructor(value: InvoiceStatusValue) {
    super(value);
  }

  static create(value: string): Result<InvoiceStatus, ValidationError> {
    if (!INVOICE_STATUSES.includes(value as InvoiceStatusValue)) {
      return Result.fail(
        new ValidationError(
          `Invalid status. Must be one of: ${INVOICE_STATUSES.join(', ')}`,
          'status',
        ),
      );
    }
    return Result.ok(new InvoiceStatus(value as InvoiceStatusValue));
  }

  static draft(): InvoiceStatus {
    return new InvoiceStatus('DRAFT');
  }

  static pending(): InvoiceStatus {
    return new InvoiceStatus('PENDING');
  }

  static issued(): InvoiceStatus {
    return new InvoiceStatus('ISSUED');
  }

  static failed(): InvoiceStatus {
    return new InvoiceStatus('FAILED');
  }

  static canceled(): InvoiceStatus {
    return new InvoiceStatus('CANCELED');
  }

  isDraft(): boolean {
    return this._value === 'DRAFT';
  }

  isPending(): boolean {
    return this._value === 'PENDING';
  }

  isIssued(): boolean {
    return this._value === 'ISSUED';
  }

  isFailed(): boolean {
    return this._value === 'FAILED';
  }

  isCanceled(): boolean {
    return this._value === 'CANCELED';
  }

  /**
   * Pure function: Checks if transition is valid
   */
  canTransitionTo(newStatus: InvoiceStatus): boolean {
    const transitions: Record<InvoiceStatusValue, InvoiceStatusValue[]> = {
      DRAFT: ['PENDING', 'CANCELED'],
      PENDING: ['ISSUED', 'FAILED'],
      ISSUED: [], // Final state
      FAILED: ['PENDING', 'CANCELED'],
      CANCELED: [], // Final state
    };

    return transitions[this._value].includes(newStatus.value);
  }
}
