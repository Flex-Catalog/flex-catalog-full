import { AggregateRoot } from '../../../../../@core/domain/aggregate-root.base';
import { Result, ValidationError } from '../../../../../@core/domain/result';
import { InvoiceStatus, InvoiceStatusValue } from '../../value-objects/invoice-status.vo';
import {
  InvoiceCreatedEvent,
  InvoiceIssuedEvent,
  InvoiceFailedEvent,
  InvoiceCanceledEvent,
} from '../../events/invoice.events';

/**
 * Invoice Props - Immutable
 */
interface InvoiceProps {
  readonly tenantId: string;
  readonly country: string;
  readonly status: InvoiceStatus;
  readonly payload: Readonly<Record<string, unknown>>;
  readonly result: Readonly<Record<string, unknown>> | null;
  readonly createdById: string;
  readonly updatedById: string;
  readonly issuedById: string | null;
  readonly issuedAt: Date | null;
}

/**
 * Create Invoice Input
 */
export interface CreateInvoiceInput {
  readonly id?: string;
  readonly tenantId: string;
  readonly country: string;
  readonly payload: Record<string, unknown>;
  readonly createdById: string;
}

/**
 * Invoice Aggregate Root
 * - SRP: Business rules for invoices
 * - Immutability: State changes through methods
 * - Domain events for side effects
 */
export class Invoice extends AggregateRoot<string> {
  private _props: InvoiceProps;

  private constructor(id: string, props: InvoiceProps, createdAt?: Date) {
    super(id, createdAt);
    this._props = props;
  }

  // Getters
  get tenantId(): string {
    return this._props.tenantId;
  }

  get country(): string {
    return this._props.country;
  }

  get status(): InvoiceStatusValue {
    return this._props.status.value;
  }

  get payload(): Readonly<Record<string, unknown>> {
    return this._props.payload;
  }

  get result(): Readonly<Record<string, unknown>> | null {
    return this._props.result;
  }

  get createdById(): string {
    return this._props.createdById;
  }

  get updatedById(): string {
    return this._props.updatedById;
  }

  get issuedById(): string | null {
    return this._props.issuedById;
  }

  get issuedAt(): Date | null {
    return this._props.issuedAt;
  }

  /**
   * Helper: Gets customer name from payload
   */
  get customerName(): string {
    const payload = this._props.payload as any;
    return (
      payload?.customer?.name ||
      payload?.recipientName ||
      payload?.destinatario?.nome ||
      'Customer'
    );
  }

  /**
   * Factory method - Creates new invoice as DRAFT
   */
  static create(input: CreateInvoiceInput): Result<Invoice, ValidationError> {
    if (!input.country || input.country.trim().length === 0) {
      return Result.fail(new ValidationError('Country is required', 'country'));
    }

    if (!input.payload || Object.keys(input.payload).length === 0) {
      return Result.fail(new ValidationError('Payload is required', 'payload'));
    }

    const id = input.id ?? Invoice.generateId();

    const invoice = new Invoice(id, {
      tenantId: input.tenantId,
      country: input.country.toUpperCase(),
      status: InvoiceStatus.draft(),
      payload: Object.freeze({ ...input.payload }),
      result: null,
      createdById: input.createdById,
      updatedById: input.createdById,
      issuedById: null,
      issuedAt: null,
    });

    invoice.addDomainEvent(
      new InvoiceCreatedEvent(
        invoice.id,
        invoice.tenantId,
        invoice.country,
        invoice.customerName,
        invoice.createdById,
      ),
    );

    return Result.ok(invoice);
  }

  /**
   * Reconstitutes from persistence
   */
  static reconstitute(
    id: string,
    props: {
      tenantId: string;
      country: string;
      status: string;
      payload: Record<string, unknown>;
      result: Record<string, unknown> | null;
      createdById: string;
      updatedById: string;
      issuedById: string | null;
      issuedAt: Date | null;
      createdAt: Date;
    },
  ): Invoice {
    return new Invoice(
      id,
      {
        tenantId: props.tenantId,
        country: props.country,
        status: InvoiceStatus.create(props.status).value,
        payload: Object.freeze({ ...props.payload }),
        result: props.result ? Object.freeze({ ...props.result }) : null,
        createdById: props.createdById,
        updatedById: props.updatedById,
        issuedById: props.issuedById,
        issuedAt: props.issuedAt,
      },
      props.createdAt,
    );
  }

  /**
   * Marks invoice as pending (before issuing)
   */
  markPending(userId: string): Result<void, ValidationError> {
    const newStatus = InvoiceStatus.pending();

    if (!this._props.status.canTransitionTo(newStatus)) {
      return Result.fail(
        new ValidationError(`Cannot transition from ${this.status} to PENDING`),
      );
    }

    this._props = {
      ...this._props,
      status: newStatus,
      updatedById: userId,
    };
    this.touch();

    return Result.void();
  }

  /**
   * Marks invoice as issued with fiscal result
   */
  markIssued(userId: string, fiscalResult: Record<string, unknown>): Result<void, ValidationError> {
    const newStatus = InvoiceStatus.issued();

    if (!this._props.status.canTransitionTo(newStatus)) {
      return Result.fail(
        new ValidationError(`Cannot transition from ${this.status} to ISSUED`),
      );
    }

    this._props = {
      ...this._props,
      status: newStatus,
      result: Object.freeze({ ...fiscalResult }),
      updatedById: userId,
      issuedById: userId,
      issuedAt: new Date(),
    };
    this.touch();

    this.addDomainEvent(
      new InvoiceIssuedEvent(
        this.id,
        this.tenantId,
        this.country,
        this.customerName,
        userId,
        fiscalResult,
      ),
    );

    return Result.void();
  }

  /**
   * Marks invoice as failed
   */
  markFailed(userId: string, errorMessage: string): Result<void, ValidationError> {
    const newStatus = InvoiceStatus.failed();

    if (!this._props.status.canTransitionTo(newStatus)) {
      return Result.fail(
        new ValidationError(`Cannot transition from ${this.status} to FAILED`),
      );
    }

    this._props = {
      ...this._props,
      status: newStatus,
      result: Object.freeze({ error: errorMessage }),
      updatedById: userId,
    };
    this.touch();

    this.addDomainEvent(
      new InvoiceFailedEvent(this.id, this.tenantId, errorMessage, userId),
    );

    return Result.void();
  }

  /**
   * Cancels invoice
   */
  cancel(userId: string): Result<void, ValidationError> {
    if (this._props.status.isIssued()) {
      return Result.fail(new ValidationError('Issued invoices cannot be canceled'));
    }

    const newStatus = InvoiceStatus.canceled();

    if (!this._props.status.canTransitionTo(newStatus)) {
      return Result.fail(
        new ValidationError(`Cannot transition from ${this.status} to CANCELED`),
      );
    }

    this._props = {
      ...this._props,
      status: newStatus,
      updatedById: userId,
    };
    this.touch();

    this.addDomainEvent(
      new InvoiceCanceledEvent(this.id, this.tenantId, this.customerName, userId),
    );

    return Result.void();
  }

  /**
   * Converts to persistence format
   */
  toPersistence(): Record<string, unknown> {
    return {
      id: this.id,
      tenantId: this.tenantId,
      country: this.country,
      status: this.status,
      payload: { ...this.payload },
      result: this.result ? { ...this.result } : null,
      createdById: this.createdById,
      updatedById: this.updatedById,
      issuedById: this.issuedById,
      issuedAt: this.issuedAt,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const random = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    return (timestamp + random).substring(0, 24);
  }
}
