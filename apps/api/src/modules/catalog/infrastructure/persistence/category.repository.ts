import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Result, NotFoundError } from '../../../../@core/domain/result';
import { PaginatedResult, createPaginatedResult } from '../../../../@core/domain/repository.interface';
import { Category } from '../../domain/aggregates/category/category.aggregate';
import { ICategoryRepository, CategoryQueryOptions } from '../../domain/repositories/category.repository.interface';

/**
 * Prisma Category Repository
 */
@Injectable()
export class PrismaCategoryRepository implements ICategoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(id: string, tenantId: string): Promise<Result<Category, Error>> {
    const record = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!record) {
      return Result.fail(new NotFoundError('Category', id));
    }

    return Result.ok(this.toDomain(record));
  }

  async findByName(name: string, tenantId: string): Promise<Result<Category | null, Error>> {
    const record = await this.prisma.category.findFirst({
      where: { name, tenantId },
    });

    if (!record) {
      return Result.ok(null);
    }

    return Result.ok(this.toDomain(record));
  }

  async findAll(
    tenantId: string,
    options: CategoryQueryOptions,
  ): Promise<Result<PaginatedResult<Category>, Error>> {
    const where: any = { tenantId };

    if (options.parentId !== undefined) {
      where.parentId = options.parentId;
    }

    if (options.search) {
      where.name = { contains: options.search, mode: 'insensitive' };
    }

    const skip = (options.page - 1) * options.limit;

    const [records, total] = await Promise.all([
      this.prisma.category.findMany({
        where,
        skip,
        take: options.limit,
        orderBy: options.sortBy
          ? { [options.sortBy]: options.sortOrder ?? 'asc' }
          : { name: 'asc' },
      }),
      this.prisma.category.count({ where }),
    ]);

    const categories = records.map((r) => this.toDomain(r));

    return Result.ok(createPaginatedResult(categories, total, options));
  }

  async findChildren(parentId: string, tenantId: string): Promise<Result<Category[], Error>> {
    const records = await this.prisma.category.findMany({
      where: { parentId, tenantId },
      orderBy: { name: 'asc' },
    });

    return Result.ok(records.map((r) => this.toDomain(r)));
  }

  async save(category: Category): Promise<Result<void, Error>> {
    const data = this.toPersistence(category);

    await this.prisma.category.upsert({
      where: { id: category.id },
      create: data as any,
      update: {
        name: data.name,
        parentId: data.parentId as any,
        updatedById: data.updatedById,
        updatedAt: new Date(),
      },
    });

    return Result.void();
  }

  async delete(id: string, tenantId: string): Promise<Result<void, Error>> {
    await this.prisma.category.deleteMany({
      where: { id, tenantId },
    });

    return Result.void();
  }

  async existsWithName(name: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const where: any = { name, tenantId };
    if (excludeId) {
      where.NOT = { id: excludeId };
    }

    const count = await this.prisma.category.count({ where });
    return count > 0;
  }

  async hasChildren(categoryId: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.category.count({
      where: { parentId: categoryId, tenantId },
    });
    return count > 0;
  }

  private toDomain(record: any): Category {
    return Category.reconstitute(record.id, {
      tenantId: record.tenantId,
      name: record.name,
      parentId: record.parentId,
      createdById: record.createdById ?? record.tenantId,
      updatedById: record.updatedById ?? record.tenantId,
      createdAt: record.createdAt,
    });
  }

  private toPersistence(category: Category): Record<string, unknown> {
    return {
      id: category.id,
      tenantId: category.tenantId,
      name: category.name,
      parentId: category.parentId,
      createdById: category.createdById,
      updatedById: category.updatedById,
    };
  }
}
