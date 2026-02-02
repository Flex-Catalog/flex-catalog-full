import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Result, NotFoundError } from '../../../../@core/domain/result';
import { PaginatedResult, createPaginatedResult } from '../../../../@core/domain/repository.interface';
import { Product } from '../../domain/aggregates/product/product.aggregate';
import { IProductRepository, ProductQueryOptions } from '../../domain/repositories/product.repository.interface';

/**
 * Prisma Product Repository
 * - SRP: Only persistence operations
 * - Dependency Inversion: Implements interface
 * - Delegation: Uses Prisma for actual DB operations
 */
@Injectable()
export class PrismaProductRepository implements IProductRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<Result<Product, Error>> {
    const record = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      return Result.fail(new NotFoundError('Product', id));
    }

    return Result.ok(this.toDomain(record));
  }

  async findBySku(sku: string, tenantId: string): Promise<Result<Product | null, Error>> {
    const record = await this.prisma.product.findFirst({
      where: { sku, tenantId },
    });

    if (!record) {
      return Result.ok(null);
    }

    return Result.ok(this.toDomain(record));
  }

  async findAll(
    tenantId: string,
    options: ProductQueryOptions,
  ): Promise<Result<PaginatedResult<Product>, Error>> {
    const where: any = { tenantId };

    if (options.categoryId !== undefined) {
      where.categoryId = options.categoryId;
    }

    if (options.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { sku: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const skip = (options.page - 1) * options.limit;

    const [records, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: options.sortBy
          ? { [options.sortBy]: options.sortOrder ?? 'asc' }
          : { createdAt: 'desc' },
      }),
      this.prisma.product.count({ where }),
    ]);

    const products = records.map((r) => this.toDomain(r));

    return Result.ok(createPaginatedResult(products, total, options));
  }

  async save(product: Product): Promise<Result<void, Error>> {
    const data = this.toPersistence(product);

    await this.prisma.product.upsert({
      where: { id: product.id },
      create: data as any,
      update: {
        name: data.name,
        sku: data.sku,
        priceCents: data.priceCents,
        currency: data.currency,
        categoryId: data.categoryId,
        attributes: data.attributes as any,
        fiscal: data.fiscal as any,
        images: data.images,
        isActive: data.isActive,
        updatedById: data.updatedById,
        updatedAt: new Date(),
      },
    });

    return Result.void();
  }

  async delete(id: string, tenantId: string): Promise<Result<void, Error>> {
    await this.prisma.product.deleteMany({
      where: { id, tenantId },
    });

    return Result.void();
  }

  async existsWithSku(sku: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const where: any = { sku, tenantId };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await this.prisma.product.count({ where });
    return count > 0;
  }

  async countByCategory(categoryId: string, tenantId: string): Promise<number> {
    return this.prisma.product.count({
      where: { categoryId, tenantId },
    });
  }

  /**
   * Pure function: Maps Prisma record to domain aggregate
   */
  private toDomain(record: any): Product {
    return Product.reconstitute(record.id, {
      tenantId: record.tenantId,
      name: record.name,
      sku: record.sku,
      priceCents: record.priceCents,
      currency: record.currency,
      categoryId: record.categoryId,
      attributes: record.attributes ?? {},
      fiscal: record.fiscal ?? {},
      images: record.images ?? [],
      isActive: record.isActive,
      createdById: record.createdById ?? record.tenantId,
      updatedById: record.updatedById ?? record.tenantId,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    });
  }

  /**
   * Pure function: Maps domain aggregate to persistence format
   */
  private toPersistence(product: Product): Record<string, unknown> {
    return {
      id: product.id,
      tenantId: product.tenantId,
      name: product.name,
      sku: product.sku,
      priceCents: product.priceCents,
      currency: product.currency,
      categoryId: product.categoryId,
      attributes: product.attributes,
      fiscal: product.fiscal,
      images: [...product.images],
      isActive: product.isActive,
      createdById: product.createdById,
      updatedById: product.updatedById,
    };
  }
}
