import { Inject, Injectable } from '@nestjs/common';
import { IUseCase, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result, NotFoundError, ConflictError } from '../../../../../@core/domain/result';
import { IEventBus } from '../../../../../@core/domain/domain-event.base';
import { EVENT_BUS } from '../../../../../@core/infrastructure/event-bus';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import { PrismaService } from '../../../../../prisma/prisma.service';

export interface UpdateProductDto {
  readonly name?: string;
  readonly sku?: string;
  readonly priceCents?: number;
  readonly costCents?: number | null;
  readonly currency?: string;
  readonly stockMinAlert?: number | null;
  readonly categoryId?: string | null;
  readonly attributes?: Record<string, unknown>;
  readonly fiscal?: Record<string, unknown>;
  readonly isActive?: boolean;
}

export interface UpdateProductUseCaseInput {
  readonly context: UseCaseContext;
  readonly productId: string;
  readonly data: UpdateProductDto;
}

@Injectable()
export class UpdateProductUseCase implements IUseCase<UpdateProductUseCaseInput, void> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: UpdateProductUseCaseInput): Promise<Result<void, Error>> {
    const { context, productId, data } = input;

    const productResult = await this.productRepository.findById(productId, context.tenantId);
    if (productResult.isFailure) return Result.fail(new NotFoundError('Product', productId));

    const product = productResult.value;
    const oldPriceCents = product.priceCents;
    const oldCostCents = product.costCents;

    if (data.sku && data.sku !== product.sku) {
      const exists = await this.productRepository.existsWithSku(data.sku, context.tenantId, productId);
      if (exists) return Result.fail(new ConflictError(`SKU ${data.sku} already exists`));
    }

    const updateResult = product.update({ ...data, updatedById: context.userId });
    if (updateResult.isFailure) return Result.fail(updateResult.error);

    const saveResult = await this.productRepository.save(product);
    if (saveResult.isFailure) return Result.fail(saveResult.error);

    // Record price history if price or cost changed
    const priceChanged = data.priceCents !== undefined && data.priceCents !== oldPriceCents;
    const costChanged = 'costCents' in data && data.costCents !== oldCostCents;
    if (priceChanged || costChanged) {
      await this.prisma.productPriceHistory.create({
        data: {
          productId: product.id,
          tenantId: context.tenantId,
          priceCents: product.priceCents,
          costCents: product.costCents,
          changedById: context.userId,
          reason: priceChanged && costChanged
            ? 'Preço e custo atualizados'
            : priceChanged ? 'Preço atualizado' : 'Custo atualizado',
        },
      });
    }

    await this.eventBus.publishAll([...product.domainEvents]);
    product.clearDomainEvents();

    return Result.void();
  }
}
