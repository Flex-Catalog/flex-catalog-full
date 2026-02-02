import { Inject, Injectable } from '@nestjs/common';
import { IUseCase, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result, ValidationError, ConflictError } from '../../../../../@core/domain/result';
import { IEventBus } from '../../../../../@core/domain/domain-event.base';
import { EVENT_BUS } from '../../../../../@core/infrastructure/event-bus';
import { Product, CreateProductInput } from '../../../domain/aggregates/product/product.aggregate';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';

/**
 * Create Product DTO
 */
export interface CreateProductDto {
  readonly name: string;
  readonly sku?: string;
  readonly priceCents: number;
  readonly currency?: string;
  readonly categoryId?: string;
  readonly attributes?: Record<string, unknown>;
  readonly fiscal?: Record<string, unknown>;
  readonly images?: string[];
}

/**
 * Create Product Input
 */
export interface CreateProductUseCaseInput {
  readonly context: UseCaseContext;
  readonly data: CreateProductDto;
}

/**
 * Create Product Output
 */
export interface CreateProductUseCaseOutput {
  readonly id: string;
  readonly name: string;
  readonly sku: string | null;
  readonly priceCents: number;
  readonly currency: string;
}

/**
 * Create Product Use Case
 * - SRP: Only creates products
 * - Pure business logic
 * - Emits domain events
 */
@Injectable()
export class CreateProductUseCase
  implements IUseCase<CreateProductUseCaseInput, CreateProductUseCaseOutput>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(
    input: CreateProductUseCaseInput,
  ): Promise<Result<CreateProductUseCaseOutput, Error>> {
    const { context, data } = input;

    // Check SKU uniqueness if provided
    if (data.sku) {
      const exists = await this.productRepository.existsWithSku(data.sku, context.tenantId);
      if (exists) {
        return Result.fail(new ConflictError(`SKU ${data.sku} already exists`));
      }
    }

    // Create product aggregate
    const productInput: CreateProductInput = {
      tenantId: context.tenantId,
      name: data.name,
      sku: data.sku,
      priceCents: data.priceCents,
      currency: data.currency,
      categoryId: data.categoryId,
      attributes: data.attributes,
      fiscal: data.fiscal,
      images: data.images,
      createdById: context.userId,
    };

    const productResult = Product.create(productInput);
    if (productResult.isFailure) {
      return Result.fail(productResult.error);
    }

    const product = productResult.value;

    // Persist
    const saveResult = await this.productRepository.save(product);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error);
    }

    // Dispatch domain events
    await this.eventBus.publishAll([...product.domainEvents]);
    product.clearDomainEvents();

    return Result.ok({
      id: product.id,
      name: product.name,
      sku: product.sku,
      priceCents: product.priceCents,
      currency: product.currency,
    });
  }
}
