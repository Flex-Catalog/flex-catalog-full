import { Inject, Injectable } from '@nestjs/common';
import { IQuery, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result, NotFoundError } from '../../../../../@core/domain/result';
import { Product } from '../../../domain/aggregates/product/product.aggregate';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';

export interface GetProductInput {
  readonly context: UseCaseContext;
  readonly productId: string;
}

export interface ProductDto {
  readonly id: string;
  readonly name: string;
  readonly sku: string | null;
  readonly priceCents: number;
  readonly costCents: number | null;
  readonly currency: string;
  readonly stockQuantity: number;
  readonly stockMinAlert: number | null;
  readonly marginPercent: number | null;
  readonly isLowStock: boolean;
  readonly categoryId: string | null;
  readonly attributes: Record<string, unknown>;
  readonly fiscal: Record<string, unknown>;
  readonly images: string[];
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

@Injectable()
export class GetProductQuery implements IQuery<GetProductInput, ProductDto> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(input: GetProductInput): Promise<Result<ProductDto, Error>> {
    const productResult = await this.productRepository.findById(input.productId, input.context.tenantId);
    if (productResult.isFailure) return Result.fail(new NotFoundError('Product', input.productId));
    return Result.ok(this.toDto(productResult.value));
  }

  toDto(product: Product): ProductDto {
    return Object.freeze({
      id: product.id,
      name: product.name,
      sku: product.sku,
      priceCents: product.priceCents,
      costCents: product.costCents,
      currency: product.currency,
      stockQuantity: product.stockQuantity,
      stockMinAlert: product.stockMinAlert,
      marginPercent: product.marginPercent != null ? Math.round(product.marginPercent * 10) / 10 : null,
      isLowStock: product.isLowStock,
      categoryId: product.categoryId,
      attributes: { ...product.attributes },
      fiscal: { ...product.fiscal },
      images: [...product.images],
      isActive: product.isActive,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
  }
}
