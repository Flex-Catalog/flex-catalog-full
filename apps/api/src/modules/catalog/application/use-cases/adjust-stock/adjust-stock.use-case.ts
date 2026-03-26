import { Inject, Injectable } from '@nestjs/common';
import { IUseCase, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result, NotFoundError } from '../../../../../@core/domain/result';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import { PrismaService } from '../../../../../prisma/prisma.service';

export interface AdjustStockDto {
  readonly quantity: number; // positive = add, negative = subtract
  readonly reason?: string;
}

export interface AdjustStockInput {
  readonly context: UseCaseContext;
  readonly productId: string;
  readonly data: AdjustStockDto;
}

export interface AdjustStockOutput {
  readonly productId: string;
  readonly previousQty: number;
  readonly newQty: number;
  readonly delta: number;
}

@Injectable()
export class AdjustStockUseCase implements IUseCase<AdjustStockInput, AdjustStockOutput> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: AdjustStockInput): Promise<Result<AdjustStockOutput, Error>> {
    const { context, productId, data } = input;

    const productResult = await this.productRepository.findById(productId, context.tenantId);
    if (productResult.isFailure) return Result.fail(new NotFoundError('Product', productId));

    const product = productResult.value;
    const previousQty = product.stockQuantity;

    const adjustResult = product.adjustStock(data.quantity, context.userId);
    if (adjustResult.isFailure) return Result.fail(adjustResult.error);

    const saveResult = await this.productRepository.save(product);
    if (saveResult.isFailure) return Result.fail(saveResult.error);

    await this.prisma.stockMovement.create({
      data: {
        productId,
        tenantId: context.tenantId,
        type: data.quantity > 0 ? 'IN' : data.quantity < 0 ? 'OUT' : 'ADJUSTMENT',
        quantity: data.quantity,
        reason: data.reason,
        createdById: context.userId,
      },
    });

    return Result.ok({
      productId,
      previousQty,
      newQty: product.stockQuantity,
      delta: data.quantity,
    });
  }
}
