import { Result } from '../../../../@core/domain/result';
import { PaginatedResult, QueryOptions } from '../../../../@core/domain/repository.interface';
import { Category } from '../aggregates/category/category.aggregate';

/**
 * Category Query Options
 */
export interface CategoryQueryOptions extends QueryOptions {
  readonly parentId?: string | null;
  readonly search?: string;
}

/**
 * Category Repository Interface
 */
export interface ICategoryRepository {
  findById(id: string, tenantId: string): Promise<Result<Category, Error>>;
  findByName(name: string, tenantId: string): Promise<Result<Category | null, Error>>;
  findAll(tenantId: string, options: CategoryQueryOptions): Promise<Result<PaginatedResult<Category>, Error>>;
  findChildren(parentId: string, tenantId: string): Promise<Result<Category[], Error>>;
  save(category: Category): Promise<Result<void, Error>>;
  delete(id: string, tenantId: string): Promise<Result<void, Error>>;
  existsWithName(name: string, tenantId: string, excludeId?: string): Promise<boolean>;
  hasChildren(categoryId: string, tenantId: string): Promise<boolean>;
}

/**
 * Category Repository Token
 */
export const CATEGORY_REPOSITORY = Symbol('CATEGORY_REPOSITORY');
