import { Inject, Injectable } from '@nestjs/common';
import { IUseCase, IQuery, UseCaseContext } from '../../../../@core/application/use-case.interface';
import { Result, ValidationError, NotFoundError } from '../../../../@core/domain/result';
import { IEventBus } from '../../../../@core/domain/domain-event.base';
import { EVENT_BUS } from '../../../../@core/infrastructure/event-bus';
import { Invoice, CreateInvoiceInput } from '../../domain/aggregates/invoice/invoice.aggregate';
import { IInvoiceRepository, INVOICE_REPOSITORY, InvoiceQueryOptions } from '../../domain/repositories/invoice.repository.interface';
import { IFiscalProviderRegistry, FISCAL_PROVIDER_REGISTRY } from '../../domain/services/fiscal-provider.interface';
import { InvoiceStatusValue } from '../../domain/value-objects/invoice-status.vo';

// ============ DTOs ============

export interface InvoiceDto {
  readonly id: string;
  readonly country: string;
  readonly status: InvoiceStatusValue;
  readonly payload: Record<string, unknown>;
  readonly result: Record<string, unknown> | null;
  readonly customerName: string;
  readonly issuedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateInvoiceDto {
  readonly country: string;
  readonly payload: Record<string, unknown>;
}

// ============ Use Cases ============

/**
 * Create Invoice Use Case
 */
@Injectable()
export class CreateInvoiceUseCase
  implements IUseCase<{ context: UseCaseContext; data: CreateInvoiceDto }, InvoiceDto>
{
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepository,
    @Inject(FISCAL_PROVIDER_REGISTRY)
    private readonly providerRegistry: IFiscalProviderRegistry,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(
    input: { context: UseCaseContext; data: CreateInvoiceDto },
  ): Promise<Result<InvoiceDto, Error>> {
    const { context, data } = input;

    // Validate provider exists for country
    const provider = this.providerRegistry.getProvider(data.country);
    if (!provider) {
      return Result.fail(
        new ValidationError(
          `No fiscal provider available for country: ${data.country}. Supported: ${this.providerRegistry.getSupportedCountries().join(', ')}`,
          'country',
        ),
      );
    }

    // Validate payload
    const validation = provider.validate(data.payload);
    if (validation.isFailure) {
      return Result.fail(validation.error);
    }

    // Create invoice
    const invoiceResult = Invoice.create({
      tenantId: context.tenantId,
      country: data.country,
      payload: data.payload,
      createdById: context.userId,
    });

    if (invoiceResult.isFailure) {
      return Result.fail(invoiceResult.error);
    }

    const invoice = invoiceResult.value;

    // Save
    const saveResult = await this.invoiceRepository.save(invoice);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error);
    }

    // Dispatch events
    await this.eventBus.publishAll([...invoice.domainEvents]);
    invoice.clearDomainEvents();

    return Result.ok(this.toDto(invoice));
  }

  private toDto(invoice: Invoice): InvoiceDto {
    return Object.freeze({
      id: invoice.id,
      country: invoice.country,
      status: invoice.status,
      payload: { ...invoice.payload },
      result: invoice.result ? { ...invoice.result } : null,
      customerName: invoice.customerName,
      issuedAt: invoice.issuedAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    });
  }
}

/**
 * Issue Invoice Use Case
 */
@Injectable()
export class IssueInvoiceUseCase
  implements IUseCase<{ context: UseCaseContext; invoiceId: string }, InvoiceDto>
{
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepository,
    @Inject(FISCAL_PROVIDER_REGISTRY)
    private readonly providerRegistry: IFiscalProviderRegistry,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(
    input: { context: UseCaseContext; invoiceId: string },
  ): Promise<Result<InvoiceDto, Error>> {
    const { context, invoiceId } = input;

    // Find invoice
    const invoiceResult = await this.invoiceRepository.findById(invoiceId, context.tenantId);
    if (invoiceResult.isFailure) {
      return Result.fail(new NotFoundError('Invoice', invoiceId));
    }

    const invoice = invoiceResult.value;

    // Get provider
    const provider = this.providerRegistry.getProvider(invoice.country);
    if (!provider) {
      return Result.fail(new ValidationError(`No provider for country: ${invoice.country}`));
    }

    // Mark as pending
    const pendingResult = invoice.markPending(context.userId);
    if (pendingResult.isFailure) {
      return Result.fail(pendingResult.error);
    }

    await this.invoiceRepository.save(invoice);

    // Issue with fiscal provider
    const issueResult = await provider.issue(
      { ...invoice.payload } as Record<string, unknown>,
      context.tenantId,
    );

    if (issueResult.isFailure) {
      invoice.markFailed(context.userId, issueResult.error.message);
      await this.invoiceRepository.save(invoice);
      await this.eventBus.publishAll([...invoice.domainEvents]);
      invoice.clearDomainEvents();
      return Result.fail(issueResult.error);
    }

    const fiscalResult = issueResult.value;

    if (!fiscalResult.success) {
      invoice.markFailed(context.userId, fiscalResult.error ?? 'Unknown error');
      await this.invoiceRepository.save(invoice);
      await this.eventBus.publishAll([...invoice.domainEvents]);
      invoice.clearDomainEvents();
      return Result.ok(this.toDto(invoice));
    }

    // Mark as issued
    invoice.markIssued(context.userId, fiscalResult.data ?? {});
    await this.invoiceRepository.save(invoice);

    // Dispatch events
    await this.eventBus.publishAll([...invoice.domainEvents]);
    invoice.clearDomainEvents();

    return Result.ok(this.toDto(invoice));
  }

  private toDto(invoice: Invoice): InvoiceDto {
    return Object.freeze({
      id: invoice.id,
      country: invoice.country,
      status: invoice.status,
      payload: { ...invoice.payload },
      result: invoice.result ? { ...invoice.result } : null,
      customerName: invoice.customerName,
      issuedAt: invoice.issuedAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    });
  }
}

/**
 * Cancel Invoice Use Case
 */
@Injectable()
export class CancelInvoiceUseCase
  implements IUseCase<{ context: UseCaseContext; invoiceId: string }, void>
{
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: { context: UseCaseContext; invoiceId: string }): Promise<Result<void, Error>> {
    const { context, invoiceId } = input;

    const invoiceResult = await this.invoiceRepository.findById(invoiceId, context.tenantId);
    if (invoiceResult.isFailure) {
      return Result.fail(new NotFoundError('Invoice', invoiceId));
    }

    const invoice = invoiceResult.value;

    const cancelResult = invoice.cancel(context.userId);
    if (cancelResult.isFailure) {
      return Result.fail(cancelResult.error);
    }

    await this.invoiceRepository.save(invoice);

    await this.eventBus.publishAll([...invoice.domainEvents]);
    invoice.clearDomainEvents();

    return Result.void();
  }
}

/**
 * Get Invoice Query
 */
@Injectable()
export class GetInvoiceQuery
  implements IQuery<{ context: UseCaseContext; invoiceId: string }, InvoiceDto>
{
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepository,
  ) {}

  async execute(input: { context: UseCaseContext; invoiceId: string }): Promise<Result<InvoiceDto, Error>> {
    const invoiceResult = await this.invoiceRepository.findById(input.invoiceId, input.context.tenantId);

    if (invoiceResult.isFailure) {
      return Result.fail(new NotFoundError('Invoice', input.invoiceId));
    }

    return Result.ok(this.toDto(invoiceResult.value));
  }

  private toDto(invoice: Invoice): InvoiceDto {
    return Object.freeze({
      id: invoice.id,
      country: invoice.country,
      status: invoice.status,
      payload: { ...invoice.payload },
      result: invoice.result ? { ...invoice.result } : null,
      customerName: invoice.customerName,
      issuedAt: invoice.issuedAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    });
  }
}

/**
 * List Invoices Query
 */
@Injectable()
export class ListInvoicesQuery
  implements IQuery<
    { context: UseCaseContext; page?: number; limit?: number; status?: string },
    { data: InvoiceDto[]; total: number; page: number; limit: number; totalPages: number }
  >
{
  constructor(
    @Inject(INVOICE_REPOSITORY)
    private readonly invoiceRepository: IInvoiceRepository,
  ) {}

  async execute(
    input: { context: UseCaseContext; page?: number; limit?: number; status?: string },
  ): Promise<Result<{ data: InvoiceDto[]; total: number; page: number; limit: number; totalPages: number }, Error>> {
    const options: InvoiceQueryOptions = {
      page: input.page ?? 1,
      limit: input.limit ?? 20,
      status: input.status as InvoiceStatusValue,
    };

    const result = await this.invoiceRepository.findAll(input.context.tenantId, options);

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    const paginated = result.value;

    return Result.ok({
      data: paginated.data.map((i) => this.toDto(i)),
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
      totalPages: paginated.totalPages,
    });
  }

  private toDto(invoice: Invoice): InvoiceDto {
    return Object.freeze({
      id: invoice.id,
      country: invoice.country,
      status: invoice.status,
      payload: { ...invoice.payload },
      result: invoice.result ? { ...invoice.result } : null,
      customerName: invoice.customerName,
      issuedAt: invoice.issuedAt,
      createdAt: invoice.createdAt,
      updatedAt: invoice.updatedAt,
    });
  }
}
