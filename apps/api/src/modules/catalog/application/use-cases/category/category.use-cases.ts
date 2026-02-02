import { Inject, Injectable } from '@nestjs/common';
import { IUseCase, IQuery, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result, ValidationError, NotFoundError, ConflictError } from '../../../../../@core/domain/result';
import { PaginatedResult } from '../../../../../@core/domain/repository.interface';
import { IEventBus } from '../../../../../@core/domain/domain-event.base';
import { EVENT_BUS } from '../../../../../@core/infrastructure/event-bus';
import { Category, CreateCategoryInput, UpdateCategoryInput } from '../../../domain/aggregates/category/category.aggregate';
import { ICategoryRepository, CATEGORY_REPOSITORY, CategoryQueryOptions } from '../../../domain/repositories/category.repository.interface';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';

// ============ DTOs ============

export interface CategoryDto {
  readonly id: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateCategoryDto {
  readonly name: string;
  readonly parentId?: string;
}

export interface UpdateCategoryDto {
  readonly name?: string;
  readonly parentId?: string | null;
}

// ============ Use Cases ============

/**
 * Create Category Use Case
 */
@Injectable()
export class CreateCategoryUseCase implements IUseCase<{ context: UseCaseContext; data: CreateCategoryDto }, CategoryDto> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: { context: UseCaseContext; data: CreateCategoryDto }): Promise<Result<CategoryDto, Error>> {
    const { context, data } = input;

    // Check name uniqueness
    const exists = await this.categoryRepository.existsWithName(data.name, context.tenantId);
    if (exists) {
      return Result.fail(new ConflictError(`Category ${data.name} already exists`));
    }

    // Validate parent exists if provided
    if (data.parentId) {
      const parentResult = await this.categoryRepository.findById(data.parentId, context.tenantId);
      if (parentResult.isFailure) {
        return Result.fail(new ValidationError('Parent category not found', 'parentId'));
      }
    }

    const categoryResult = Category.create({
      tenantId: context.tenantId,
      name: data.name,
      parentId: data.parentId,
      createdById: context.userId,
    });

    if (categoryResult.isFailure) {
      return Result.fail(categoryResult.error);
    }

    const category = categoryResult.value;

    const saveResult = await this.categoryRepository.save(category);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error);
    }

    await this.eventBus.publishAll([...category.domainEvents]);
    category.clearDomainEvents();

    return Result.ok(this.toDto(category));
  }

  private toDto(category: Category): CategoryDto {
    return Object.freeze({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }
}

/**
 * Update Category Use Case
 */
@Injectable()
export class UpdateCategoryUseCase implements IUseCase<{ context: UseCaseContext; categoryId: string; data: UpdateCategoryDto }, CategoryDto> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: { context: UseCaseContext; categoryId: string; data: UpdateCategoryDto }): Promise<Result<CategoryDto, Error>> {
    const { context, categoryId, data } = input;

    const categoryResult = await this.categoryRepository.findById(categoryId, context.tenantId);
    if (categoryResult.isFailure) {
      return Result.fail(new NotFoundError('Category', categoryId));
    }

    const category = categoryResult.value;

    // Check name uniqueness if changing
    if (data.name && data.name !== category.name) {
      const exists = await this.categoryRepository.existsWithName(data.name, context.tenantId, categoryId);
      if (exists) {
        return Result.fail(new ConflictError(`Category ${data.name} already exists`));
      }
    }

    const updateResult = category.update({
      ...data,
      updatedById: context.userId,
    });

    if (updateResult.isFailure) {
      return Result.fail(updateResult.error);
    }

    const saveResult = await this.categoryRepository.save(category);
    if (saveResult.isFailure) {
      return Result.fail(saveResult.error);
    }

    await this.eventBus.publishAll([...category.domainEvents]);
    category.clearDomainEvents();

    return Result.ok(this.toDto(category));
  }

  private toDto(category: Category): CategoryDto {
    return Object.freeze({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }
}

/**
 * Delete Category Use Case
 */
@Injectable()
export class DeleteCategoryUseCase implements IUseCase<{ context: UseCaseContext; categoryId: string }, void> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
  ) {}

  async execute(input: { context: UseCaseContext; categoryId: string }): Promise<Result<void, Error>> {
    const { context, categoryId } = input;

    const categoryResult = await this.categoryRepository.findById(categoryId, context.tenantId);
    if (categoryResult.isFailure) {
      return Result.fail(new NotFoundError('Category', categoryId));
    }

    const category = categoryResult.value;

    // Check for children
    const hasChildren = await this.categoryRepository.hasChildren(categoryId, context.tenantId);
    if (hasChildren) {
      return Result.fail(new ConflictError('Cannot delete category with subcategories'));
    }

    // Check for products
    const productCount = await this.productRepository.countByCategory(categoryId, context.tenantId);
    if (productCount > 0) {
      return Result.fail(new ConflictError('Cannot delete category with products'));
    }

    const deletedEvent = category.markDeleted(context.userId);

    const deleteResult = await this.categoryRepository.delete(categoryId, context.tenantId);
    if (deleteResult.isFailure) {
      return Result.fail(deleteResult.error);
    }

    await this.eventBus.publish(deletedEvent);

    return Result.void();
  }
}

/**
 * Get Category Query
 */
@Injectable()
export class GetCategoryQuery implements IQuery<{ context: UseCaseContext; categoryId: string }, CategoryDto> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(input: { context: UseCaseContext; categoryId: string }): Promise<Result<CategoryDto, Error>> {
    const categoryResult = await this.categoryRepository.findById(input.categoryId, input.context.tenantId);

    if (categoryResult.isFailure) {
      return Result.fail(new NotFoundError('Category', input.categoryId));
    }

    return Result.ok(this.toDto(categoryResult.value));
  }

  private toDto(category: Category): CategoryDto {
    return Object.freeze({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }
}

/**
 * List Categories Query
 */
@Injectable()
export class ListCategoriesQuery implements IQuery<{ context: UseCaseContext; page?: number; limit?: number; parentId?: string }, { data: CategoryDto[]; total: number; page: number; limit: number; totalPages: number }> {
  constructor(
    @Inject(CATEGORY_REPOSITORY)
    private readonly categoryRepository: ICategoryRepository,
  ) {}

  async execute(input: { context: UseCaseContext; page?: number; limit?: number; parentId?: string }): Promise<Result<{ data: CategoryDto[]; total: number; page: number; limit: number; totalPages: number }, Error>> {
    const options: CategoryQueryOptions = {
      page: input.page ?? 1,
      limit: input.limit ?? 100,
      parentId: input.parentId,
    };

    const result = await this.categoryRepository.findAll(input.context.tenantId, options);

    if (result.isFailure) {
      return Result.fail(result.error);
    }

    const paginated = result.value;

    return Result.ok({
      data: paginated.data.map((c) => this.toDto(c)),
      total: paginated.total,
      page: paginated.page,
      limit: paginated.limit,
      totalPages: paginated.totalPages,
    });
  }

  private toDto(category: Category): CategoryDto {
    return Object.freeze({
      id: category.id,
      name: category.name,
      parentId: category.parentId,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }
}
