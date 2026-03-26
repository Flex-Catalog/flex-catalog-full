import { Inject, Injectable } from '@nestjs/common';
import { IQuery, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result } from '../../../../../@core/domain/result';
import { PaginatedResult } from '../../../../../@core/domain/repository.interface';
import { Product } from '../../../domain/aggregates/product/product.aggregate';
import { IProductRepository, PRODUCT_REPOSITORY, ProductQueryOptions } from '../../../domain/repositories/product.repository.interface';
import { ProductDto, GetProductQuery } from '../get-product/get-product.use-case';

export interface ListProductsInput {
  readonly context: UseCaseContext;
  readonly page?: number;
  readonly limit?: number;
  readonly categoryId?: string;
  readonly isActive?: boolean;
  readonly search?: string;
}

export interface ListProductsOutput {
  readonly data: ProductDto[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

@Injectable()
export class ListProductsQuery implements IQuery<ListProductsInput, ListProductsOutput> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(input: ListProductsInput): Promise<Result<ListProductsOutput, Error>> {
    const options: ProductQueryOptions = {
      page: input.page ?? 1,
      limit: input.limit ?? 20,
      categoryId: input.categoryId,
      isActive: input.isActive,
      search: input.search,
    };

    const result = await this.productRepository.findAll(input.context.tenantId, options);
    if (result.isFailure) return Result.fail(result.error);

    const paginatedProducts = result.value;

    return Result.ok({
      data: paginatedProducts.data.map((p) => this.toDto(p)),
      total: paginatedProducts.total,
      page: paginatedProducts.page,
      limit: paginatedProducts.limit,
      totalPages: paginatedProducts.totalPages,
    });
  }

  private toDto(product: Product): ProductDto {
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
