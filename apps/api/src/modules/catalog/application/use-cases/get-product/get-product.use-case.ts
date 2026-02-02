import { Inject, Injectable } from '@nestjs/common';
import { IQuery, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result, NotFoundError } from '../../../../../@core/domain/result';
import { Product } from '../../../domain/aggregates/product/product.aggregate';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';

/**
 * Get Product Input
 */
export interface GetProductInput {
  readonly context: UseCaseContext;
  readonly productId: string;
}

/**
 * Product DTO - Immutable output
 */
export interface ProductDto {
  readonly id: string;
  readonly name: string;
  readonly sku: string | null;
  readonly priceCents: number;
  readonly currency: string;
  readonly categoryId: string | null;
  readonly attributes: Record<string, unknown>;
  readonly fiscal: Record<string, unknown>;
  readonly images: string[];
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

/**
 * Get Product Query
 * - SRP: Only retrieves single product
 * - Pure: No side effects
 */
@Injectable()
export class GetProductQuery implements IQuery<GetProductInput, ProductDto> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(input: GetProductInput): Promise<Result<ProductDto, Error>> {
    const productResult = await this.productRepository.findById(
      input.productId,
      input.context.tenantId,
    );

    if (productResult.isFailure) {
      return Result.fail(new NotFoundError('Product', input.productId));
    }

    return Result.ok(this.toDto(productResult.value));
  }

  /**
   * Pure function: Converts aggregate to DTO
   */
  private toDto(product: Product): ProductDto {
    return Object.freeze({
      id: product.id,
      name: product.name,
      sku: product.sku,
      priceCents: product.priceCents,
      currency: product.currency,
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
