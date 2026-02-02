import { Inject, Injectable } from '@nestjs/common';
import { IUseCase, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result, NotFoundError } from '../../../../../@core/domain/result';
import { IEventBus } from '../../../../../@core/domain/domain-event.base';
import { EVENT_BUS } from '../../../../../@core/infrastructure/event-bus';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';

/**
 * Delete Product Input
 */
export interface DeleteProductUseCaseInput {
  readonly context: UseCaseContext;
  readonly productId: string;
}

/**
 * Delete Product Use Case
 * - SRP: Only deletes products
 */
@Injectable()
export class DeleteProductUseCase
  implements IUseCase<DeleteProductUseCaseInput, void>
{
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: DeleteProductUseCaseInput): Promise<Result<void, Error>> {
    const { context, productId } = input;

    // Find product
    const productResult = await this.productRepository.findById(productId, context.tenantId);
    if (productResult.isFailure) {
      return Result.fail(new NotFoundError('Product', productId));
    }

    const product = productResult.value;

    // Get deletion event before deleting
    const deletedEvent = product.markDeleted(context.userId);

    // Delete
    const deleteResult = await this.productRepository.delete(productId, context.tenantId);
    if (deleteResult.isFailure) {
      return Result.fail(deleteResult.error);
    }

    // Dispatch deletion event
    await this.eventBus.publish(deletedEvent);

    return Result.void();
  }
}
