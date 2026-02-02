import { Inject, Injectable } from '@nestjs/common';
import { IUseCase, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result, NotFoundError, ConflictError } from '../../../../../@core/domain/result';
import { IEventBus } from '../../../../../@core/domain/domain-event.base';
import { EVENT_BUS } from '../../../../../@core/infrastructure/event-bus';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';

/**
 * Update Product DTO
 */
export interface UpdateProductDto {
  readonly name?: string;
  readonly sku?: string;
  readonly priceCents?: number;
  readonly currency?: string;
  readonly categoryId?: string | null;
  readonly attributes?: Record<string, unknown>;
  readonly fiscal?: Record<string, unknown>;
  readonly isActive?: boolean;
}

/**
 * Update Product Input
 */
export interface UpdateProductUseCaseInput {
  readonly context: UseCaseContext;
  readonly productId: string;
  readonly data: UpdateProductDto;
}

/**
 * Update Product Use Case
 * - SRP: Only updates products
 */
@Injectable()
export class UpdateProductUseCase
  implements IUseCase<UpdateProductUseCaseInput, void>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: UpdateProductUseCaseInput): Promise<Result<void, Error>> {
    const { context, productId, data } = input;

    // Find product
    const productResult = await this.productRepository.findById(productId, context.tenantId);
    if (productResult.isFailure) {
      return Result.fail(new NotFoundError('Product', productId));
    }

    const product = productResult.value;

    // Check SKU uniqueness if changing
    if (data.sku && data.sku !== product.sku) {
      const exists = await this.productRepository.existsWithSku(
        data.sku,
        context.tenantId,
        productId,
      );
      if (exists) {
        return Result.fail(new ConflictError(`SKU ${data.sku} already exists`));
      }
    }

    // Update
    const updateResult = product.update({
      ...data,
      updatedById: context.userId,
    });

    if (updateResult.isFailure) {
      return Result.fail(updateResult.error);
    }

    // Persist
    const saveResult = await this.productRepository.save(product);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error);
    }

    // Dispatch events
    await this.eventBus.publishAll([...product.domainEvents]);
    product.clearDomainEvents();

    return Result.void();
  }
}
