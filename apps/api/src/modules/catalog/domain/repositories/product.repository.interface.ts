import { Result } from '../../../../@core/domain/result';
import { PaginatedResult, QueryOptions } from '../../../../@core/domain/repository.interface';
import { Product } from '../aggregates/product/product.aggregate';

/**
 * Product Query Options
 */
export interface ProductQueryOptions extends QueryOptions {
  readonly categoryId?: string;
  readonly isActive?: boolean;
  readonly search?: string;
}

/**
 * Product Repository Interface
 * - SRP: Only product persistence
 * - Dependency Inversion: Abstract interface
 */
export interface IProductRepository {
  findById(id: string, tenantId: string): Promise<Result<Product, Error>>;
  findBySku(sku: string, tenantId: string): Promise<Result<Product | null, Error>>;
  findAll(tenantId: string, options: ProductQueryOptions): Promise<Result<PaginatedResult<Product>, Error>>;
  save(product: Product): Promise<Result<void, Error>>;
  delete(id: string, tenantId: string): Promise<Result<void, Error>>;
  existsWithSku(sku: string, tenantId: string, excludeId?: string): Promise<boolean>;
  countByCategory(categoryId: string, tenantId: string): Promise<number>;
}

/**
 * Product Repository Token
 */
export const PRODUCT_REPOSITORY = Symbol('PRODUCT_REPOSITORY');
