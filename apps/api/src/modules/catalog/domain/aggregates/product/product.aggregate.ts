import { AggregateRoot } from '../../../../../@core/domain/aggregate-root.base';
import { Result, ValidationError } from '../../../../../@core/domain/result';
import { Money } from '../../../../../@core/domain/value-objects/money.vo';
import { SKU } from '../../value-objects/sku.vo';
import {
  ProductCreatedEvent,
  ProductUpdatedEvent,
  ProductDeletedEvent,
  ProductActivatedEvent,
  ProductDeactivatedEvent,
} from '../../events/product.events';

/**
 * Product Props - Immutable
 */
interface ProductProps {
  readonly tenantId: string;
  readonly name: string;
  readonly sku: SKU | null;
  readonly price: Money;
  readonly categoryId: string | null;
  readonly attributes: Readonly<Record<string, unknown>>;
  readonly fiscal: Readonly<Record<string, unknown>>;
  readonly images: readonly string[];
  readonly isActive: boolean;
  readonly createdById: string;
  readonly updatedById: string;
}

/**
 * Create Product Input
 */
export interface CreateProductInput {
  readonly id?: string;
  readonly tenantId: string;
  readonly name: string;
  readonly sku?: string;
  readonly priceCents: number;
  readonly currency?: string;
  readonly categoryId?: string;
  readonly attributes?: Record<string, unknown>;
  readonly fiscal?: Record<string, unknown>;
  readonly images?: string[];
  readonly createdById: string;
}

/**
 * Update Product Input
 */
export interface UpdateProductInput {
  readonly name?: string;
  readonly sku?: string;
  readonly priceCents?: number;
  readonly currency?: string;
  readonly categoryId?: string | null;
  readonly attributes?: Record<string, unknown>;
  readonly fiscal?: Record<string, unknown>;
  readonly isActive?: boolean;
  readonly updatedById: string;
}

/**
 * Product Aggregate Root
 * - SRP: Business rules for products
 * - Immutability: Props are readonly, changes create events
 * - Encapsulation: Private state, public behavior
 * - Law of Demeter: No direct prop access, uses getters
 */
export class Product extends AggregateRoot<string> {
  private _props: ProductProps;

  private constructor(id: string, props: ProductProps, createdAt?: Date) {
    super(id, createdAt);
    this._props = props;
  }

  // Getters - Law of Demeter: Expose only what's needed
  get tenantId(): string {
    return this._props.tenantId;
  }

  get name(): string {
    return this._props.name;
  }

  get sku(): string | null {
    return this._props.sku?.value ?? null;
  }

  get price(): Money {
    return this._props.price;
  }

  get priceCents(): number {
    return this._props.price.amountInCents;
  }

  get currency(): string {
    return this._props.price.currency;
  }

  get categoryId(): string | null {
    return this._props.categoryId;
  }

  get attributes(): Readonly<Record<string, unknown>> {
    return this._props.attributes;
  }

  get fiscal(): Readonly<Record<string, unknown>> {
    return this._props.fiscal;
  }

  get images(): readonly string[] {
    return this._props.images;
  }

  get isActive(): boolean {
    return this._props.isActive;
  }

  get createdById(): string {
    return this._props.createdById;
  }

  get updatedById(): string {
    return this._props.updatedById;
  }

  /**
   * Factory method - Creates new product with validation
   * - Pure function: Returns Result
   * - Emits domain event
   */
  static create(input: CreateProductInput): Result<Product, ValidationError> {
    // Validate name
    if (!input.name || input.name.trim().length === 0) {
      return Result.fail(new ValidationError('Product name is required', 'name'));
    }

    if (input.name.trim().length > 255) {
      return Result.fail(new ValidationError('Product name must be 255 characters or less', 'name'));
    }

    // Validate and create SKU
    let sku: SKU | null = null;
    if (input.sku) {
      const skuResult = SKU.create(input.sku);
      if (skuResult.isFailure) {
        return Result.fail(skuResult.error);
      }
      sku = skuResult.value;
    }

    // Validate and create Money
    const currency = input.currency ?? 'BRL';
    const priceResult = Money.create(input.priceCents, currency);
    if (priceResult.isFailure) {
      return Result.fail(priceResult.error);
    }

    // Generate ID if not provided (for new products)
    const id = input.id ?? Product.generateId();

    const product = new Product(id, {
      tenantId: input.tenantId,
      name: input.name.trim(),
      sku,
      price: priceResult.value,
      categoryId: input.categoryId ?? null,
      attributes: Object.freeze({ ...(input.attributes ?? {}) }),
      fiscal: Object.freeze({ ...(input.fiscal ?? {}) }),
      images: Object.freeze([...(input.images ?? [])]),
      isActive: true,
      createdById: input.createdById,
      updatedById: input.createdById,
    });

    // Emit domain event
    product.addDomainEvent(
      new ProductCreatedEvent(
        product.id,
        product.tenantId,
        product.name,
        product.sku,
        product.priceCents,
        product.currency,
        product.categoryId,
        product.createdById,
      ),
    );

    return Result.ok(product);
  }

  /**
   * Reconstitutes product from persistence
   * - No events emitted
   * - No validation (trusted source)
   */
  static reconstitute(
    id: string,
    props: {
      tenantId: string;
      name: string;
      sku: string | null;
      priceCents: number;
      currency: string;
      categoryId: string | null;
      attributes: Record<string, unknown>;
      fiscal: Record<string, unknown>;
      images: string[];
      isActive: boolean;
      createdById: string;
      updatedById: string;
      createdAt: Date;
      updatedAt: Date;
    },
  ): Product {
    const product = new Product(
      id,
      {
        tenantId: props.tenantId,
        name: props.name,
        sku: props.sku ? SKU.fromTrusted(props.sku) : null,
        price: Money.create(props.priceCents, props.currency).value,
        categoryId: props.categoryId,
        attributes: Object.freeze({ ...props.attributes }),
        fiscal: Object.freeze({ ...props.fiscal }),
        images: Object.freeze([...props.images]),
        isActive: props.isActive,
        createdById: props.createdById,
        updatedById: props.updatedById,
      },
      props.createdAt,
    );
    return product;
  }

  /**
   * Updates product with validation
   * - Immutability: Creates new props
   * - Emits domain event with changes
   */
  update(input: UpdateProductInput): Result<void, ValidationError> {
    const changes: Record<string, { old: unknown; new: unknown }> = {};
    const newProps = { ...this._props };

    // Name update
    if (input.name !== undefined) {
      if (input.name.trim().length === 0) {
        return Result.fail(new ValidationError('Product name is required', 'name'));
      }
      if (input.name.trim().length > 255) {
        return Result.fail(new ValidationError('Product name must be 255 characters or less', 'name'));
      }
      if (input.name.trim() !== this._props.name) {
        changes.name = { old: this._props.name, new: input.name.trim() };
        (newProps as any).name = input.name.trim();
      }
    }

    // SKU update
    if (input.sku !== undefined) {
      const skuResult = SKU.create(input.sku);
      if (skuResult.isFailure) {
        return Result.fail(skuResult.error);
      }
      if (skuResult.value.value !== this.sku) {
        changes.sku = { old: this.sku, new: skuResult.value.value };
        (newProps as any).sku = skuResult.value;
      }
    }

    // Price update
    if (input.priceCents !== undefined || input.currency !== undefined) {
      const newPriceCents = input.priceCents ?? this.priceCents;
      const newCurrency = input.currency ?? this.currency;
      const priceResult = Money.create(newPriceCents, newCurrency);
      if (priceResult.isFailure) {
        return Result.fail(priceResult.error);
      }
      if (newPriceCents !== this.priceCents || newCurrency !== this.currency) {
        changes.price = {
          old: { priceCents: this.priceCents, currency: this.currency },
          new: { priceCents: newPriceCents, currency: newCurrency },
        };
        (newProps as any).price = priceResult.value;
      }
    }

    // Category update
    if (input.categoryId !== undefined && input.categoryId !== this._props.categoryId) {
      changes.categoryId = { old: this._props.categoryId, new: input.categoryId };
      (newProps as any).categoryId = input.categoryId;
    }

    // Attributes update
    if (input.attributes !== undefined) {
      changes.attributes = { old: this._props.attributes, new: input.attributes };
      (newProps as any).attributes = Object.freeze({ ...input.attributes });
    }

    // Fiscal update
    if (input.fiscal !== undefined) {
      changes.fiscal = { old: this._props.fiscal, new: input.fiscal };
      (newProps as any).fiscal = Object.freeze({ ...input.fiscal });
    }

    // isActive update
    if (input.isActive !== undefined && input.isActive !== this._props.isActive) {
      changes.isActive = { old: this._props.isActive, new: input.isActive };
      (newProps as any).isActive = input.isActive;
    }

    // Only update if there are changes
    if (Object.keys(changes).length > 0) {
      (newProps as any).updatedById = input.updatedById;
      this._props = newProps;
      this.touch();

      this.addDomainEvent(
        new ProductUpdatedEvent(this.id, this.tenantId, changes, input.updatedById),
      );
    }

    return Result.void();
  }

  /**
   * Updates product images
   */
  updateImages(images: string[], updatedById: string): void {
    const oldImages = this._props.images;
    this._props = {
      ...this._props,
      images: Object.freeze([...images]),
      updatedById,
    };
    this.touch();

    this.addDomainEvent(
      new ProductUpdatedEvent(
        this.id,
        this.tenantId,
        { images: { old: oldImages, new: images } },
        updatedById,
      ),
    );
  }

  /**
   * Activates product
   */
  activate(userId: string): Result<void, ValidationError> {
    if (this._props.isActive) {
      return Result.fail(new ValidationError('Product is already active'));
    }

    this._props = { ...this._props, isActive: true, updatedById: userId };
    this.touch();

    this.addDomainEvent(new ProductActivatedEvent(this.id, this.tenantId, userId));

    return Result.void();
  }

  /**
   * Deactivates product
   */
  deactivate(userId: string): Result<void, ValidationError> {
    if (!this._props.isActive) {
      return Result.fail(new ValidationError('Product is already inactive'));
    }

    this._props = { ...this._props, isActive: false, updatedById: userId };
    this.touch();

    this.addDomainEvent(new ProductDeactivatedEvent(this.id, this.tenantId, userId));

    return Result.void();
  }

  /**
   * Marks product for deletion
   * - Returns event for audit
   */
  markDeleted(userId: string): ProductDeletedEvent {
    return new ProductDeletedEvent(this.id, this.tenantId, this.name, userId);
  }

  /**
   * Converts to plain object for persistence
   */
  toPersistence(): Record<string, unknown> {
    return {
      id: this.id,
      tenantId: this.tenantId,
      name: this.name,
      sku: this.sku,
      priceCents: this.priceCents,
      currency: this.currency,
      categoryId: this.categoryId,
      attributes: { ...this.attributes },
      fiscal: { ...this.fiscal },
      images: [...this.images],
      isActive: this.isActive,
      createdById: this.createdById,
      updatedById: this.updatedById,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  /**
   * Generates MongoDB ObjectId-like ID
   */
  private static generateId(): string {
    const timestamp = Math.floor(Date.now() / 1000).toString(16);
    const random = Array.from({ length: 16 }, () =>
      Math.floor(Math.random() * 16).toString(16),
    ).join('');
    return (timestamp + random).substring(0, 24);
  }
}
