import { AggregateRoot } from '../../../../../@core/domain/aggregate-root.base';
import { Result, ValidationError } from '../../../../../@core/domain/result';
import {
  CategoryCreatedEvent,
  CategoryUpdatedEvent,
  CategoryDeletedEvent,
} from '../../events/category.events';

/**
 * Category Props - Immutable
 */
interface CategoryProps {
  readonly tenantId: string;
  readonly name: string;
  readonly parentId: string | null;
  readonly createdById: string;
  readonly updatedById: string;
}

/**
 * Create Category Input
 */
export interface CreateCategoryInput {
  readonly id?: string;
  readonly tenantId: string;
  readonly name: string;
  readonly parentId?: string;
  readonly createdById: string;
}

/**
 * Update Category Input
 */
export interface UpdateCategoryInput {
  readonly name?: string;
  readonly parentId?: string | null;
  readonly updatedById: string;
}

/**
 * Category Aggregate Root
 * - SRP: Business rules for categories
 * - Immutability: Props are readonly
 * - Domain events for side effects
 */
export class Category extends AggregateRoot<string> {
  private _props: CategoryProps;

  private constructor(id: string, props: CategoryProps, createdAt?: Date) {
    super(id, createdAt);
    this._props = props;
  }

  // Getters
  get tenantId(): string {
    return this._props.tenantId;
  }

  get name(): string {
    return this._props.name;
  }

  get parentId(): string | null {
    return this._props.parentId;
  }

  get createdById(): string {
    return this._props.createdById;
  }

  get updatedById(): string {
    return this._props.updatedById;
  }

  /**
   * Pure function: Checks if this is a root category
   */
  isRoot(): boolean {
    return this._props.parentId === null;
  }

  /**
   * Factory method - Creates new category with validation
   */
  static create(input: CreateCategoryInput): Result<Category, ValidationError> {
    if (!input.name || input.name.trim().length === 0) {
      return Result.fail(new ValidationError('Category name is required', 'name'));
    }

    if (input.name.trim().length > 100) {
      return Result.fail(new ValidationError('Category name must be 100 characters or less', 'name'));
    }

    const id = input.id ?? Category.generateId();

    const category = new Category(id, {
      tenantId: input.tenantId,
      name: input.name.trim(),
      parentId: input.parentId ?? null,
      createdById: input.createdById,
      updatedById: input.createdById,
    });

    category.addDomainEvent(
      new CategoryCreatedEvent(
        category.id,
        category.tenantId,
        category.name,
        category.parentId,
        category.createdById,
      ),
    );

    return Result.ok(category);
  }

  /**
   * Reconstitutes from persistence
   */
  static reconstitute(
    id: string,
    props: {
      tenantId: string;
      name: string;
      parentId: string | null;
      createdById: string;
      updatedById: string;
      createdAt: Date;
    },
  ): Category {
    return new Category(id, props, props.createdAt);
  }

  /**
   * Updates category
   */
  update(input: UpdateCategoryInput): Result<void, ValidationError> {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const newProps = { ...this._props };

    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        return Result.fail(new ValidationError('Category name is required', 'name'));
      }
      if (input.name.trim().length > 100) {
        return Result.fail(new ValidationError('Category name must be 100 characters or less', 'name'));
      }
      if (input.name.trim() !== this._props.name) {
        changes.name = { old: this._props.name, new: input.name.trim() };
        (newProps as any).name = input.name.trim();
      }
    }

    if (input.parentId !== undefined && input.parentId !== this._props.parentId) {
      // Prevent circular reference
      if (input.parentId === this.id) {
        return Result.fail(new ValidationError('Category cannot be its own parent', 'parentId'));
      }
      changes.parentId = { old: this._props.parentId, new: input.parentId };
      (newProps as any).parentId = input.parentId;
    }

    if (Object.keys(changes).length > 0) {
      (newProps as any).updatedById = input.updatedById;
      this._props = newProps;
      this.touch();

      this.addDomainEvent(
        new CategoryUpdatedEvent(this.id, this.tenantId, changes, input.updatedById),
      );
    }

    return Result.void();
  }

  /**
   * Marks category for deletion
   */
  markDeleted(userId: string): CategoryDeletedEvent {
    return new CategoryDeletedEvent(this.id, this.tenantId, this.name, userId);
  }

  /**
   * Converts to persistence format
   */
  toPersistence(): Record<string, unknown> {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      parentId: this.parentId,
      createdById: this.createdById,
      updatedById: this.updatedById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  private static generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const random = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    return (timestamp + random).substring(0, 24);
  }
}
