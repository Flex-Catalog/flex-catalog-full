import { Result } from '../../../../@core/domain/result';
import { PaginatedResult, QueryOptions } from '../../../../@core/domain/repository.interface';
import { Invoice } from '../aggregates/invoice/invoice.aggregate';
import { InvoiceStatusValue } from '../value-objects/invoice-status.vo';

/**
 * Invoice Query Options
 */
export interface InvoiceQueryOptions extends QueryOptions {
  readonly status?: InvoiceStatusValue;
  readonly country?: string;
  readonly startDate?: Date;
  readonly endDate?: Date;
}

/**
 * Invoice Repository Interface
 */
export interface IInvoiceRepository {
  findById(id: string, tenantId: string): Promise<Result<Invoice, Error>>;
  findAll(tenantId: string, options: InvoiceQueryOptions): Promise<Result<PaginatedResult<Invoice>, Error>>;
  save(invoice: Invoice): Promise<Result<void, Error>>;
  countByStatus(tenantId: string, status: InvoiceStatusValue): Promise<number>;
  countByCountry(tenantId: string): Promise<Record<string, number>>;
}

/**
 * Invoice Repository Token
 */
export const INVOICE_REPOSITORY = Symbol('INVOICE_REPOSITORY');
