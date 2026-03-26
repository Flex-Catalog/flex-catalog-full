import { Inject, Injectable } from '@nestjs/common';
import { IUseCase, UseCaseContext } from '../../../../../@core/application/use-case.interface';
import { Result, ValidationError, ConflictError } from '../../../../../@core/domain/result';
import { IEventBus } from '../../../../../@core/domain/domain-event.base';
import { EVENT_BUS } from '../../../../../@core/infrastructure/event-bus';
import { Product, CreateProductInput } from '../../../domain/aggregates/product/product.aggregate';
import { IProductRepository, PRODUCT_REPOSITORY } from '../../../domain/repositories/product.repository.interface';
import { PrismaService } from '../../../../../prisma/prisma.service';

export interface CreateProductDto {
  readonly name: string;
  readonly sku?: string;
  readonly priceCents: number;
  readonly costCents?: number;
  readonly currency?: string;
  readonly stockQuantity?: number;
  readonly stockMinAlert?: number;
  readonly categoryId?: string;
  readonly attributes?: Record<string, unknown>;
  readonly fiscal?: Record<string, unknown>;
  readonly images?: string[];
}

export interface CreateProductUseCaseInput {
  readonly context: UseCaseContext;
  readonly data: CreateProductDto;
}

export interface CreateProductUseCaseOutput {
  readonly id: string;
  readonly name: string;
  readonly sku: string | null;
  readonly priceCents: number;
  readonly currency: string;
  readonly stockQuantity: number;
}

@Injectable()
export class CreateProductUseCase implements IUseCase<CreateProductUseCaseInput, CreateProductUseCaseOutput> {
  constructor(
    @Inject(PRODUCT_REPOSITORY)
    private readonly productRepository: IProductRepository,
    @Inject(EVENT_BUS)
    private readonly eventBus: IEventBus,
    private readonly prisma: PrismaService,
  ) {}

  async execute(input: CreateProductUseCaseInput): Promise<Result<CreateProductUseCaseOutput, Error>> {
    const { context, data } = input;

    if (data.sku) {
      const exists = await this.productRepository.existsWithSku(data.sku, context.tenantId);
      if (exists) return Result.fail(new ConflictError(`SKU ${data.sku} already exists`));
    }

    const productInput: CreateProductInput = {
      tenantId: context.tenantId,
      name: data.name,
      sku: data.sku,
      priceCents: data.priceCents,
      costCents: data.costCents,
      currency: data.currency,
      stockQuantity: data.stockQuantity ?? 0,
      stockMinAlert: data.stockMinAlert,
      categoryId: data.categoryId,
      attributes: data.attributes,
      fiscal: data.fiscal,
      images: data.images,
      createdById: context.userId,
    };

    const productResult = Product.create(productInput);
    if (productResult.isFailure) return Result.fail(productResult.error);

    const product = productResult.value;

    const saveResult = await this.productRepository.save(product);
    if (saveResult.isFailure) return Result.fail(saveResult.error);

    // Record initial stock movement if stock > 0
    if (product.stockQuantity > 0) {
      await this.prisma.stockMovement.create({
        data: {
          productId: product.id,
          tenantId: context.tenantId,
          type: 'IN',
          quantity: product.stockQuantity,
          reason: 'Estoque inicial',
          createdById: context.userId,
        },
      });
    }

    // Record initial price history
    await this.prisma.productPriceHistory.create({
      data: {
        productId: product.id,
        tenantId: context.tenantId,
        priceCents: product.priceCents,
        costCents: product.costCents,
        changedById: context.userId,
        reason: 'Criação do produto',
      },
    });

    await this.eventBus.publishAll([...product.domainEvents]);
    product.clearDomainEvents();

    return Result.ok({
      id: product.id,
      name: product.name,
      sku: product.sku,
      priceCents: product.priceCents,
      currency: product.currency,
      stockQuantity: product.stockQuantity,
    });
  }
}
