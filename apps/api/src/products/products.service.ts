import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductInput, UpdateProductInput, ProductAttributes } from '@product-catalog/shared';
import { z } from 'zod';

const attributesSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, input: CreateProductInput) {
    // Validate attributes
    if (input.attributes) {
      try {
        attributesSchema.parse(input.attributes);
      } catch {
        throw new BadRequestException('Invalid attributes format');
      }
    }

    // Check SKU uniqueness if provided
    if (input.sku) {
      const existing = await this.prisma.product.findFirst({
        where: {
          tenantId,
          sku: input.sku,
        },
      });

      if (existing) {
        throw new ConflictException('SKU already exists in this tenant');
      }
    }

    return this.prisma.product.create({
      data: {
        tenantId,
        name: input.name,
        sku: input.sku,
        priceCents: input.priceCents,
        currency: input.currency || 'USD',
        categoryId: input.categoryId,
        attributes: (input.attributes || {}) as ProductAttributes,
        fiscal: input.fiscal || null,
        images: [],
        isActive: true,
      },
    });
  }

  async findAll(
    tenantId: string,
    page = 1,
    limit = 20,
    categoryId?: string,
    isActive?: boolean,
  ) {
    const skip = (page - 1) * limit;
    const where: any = { tenantId };

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      data: products,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findById(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return product;
  }

  async update(id: string, tenantId: string, input: UpdateProductInput) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Validate attributes if provided
    if (input.attributes) {
      try {
        attributesSchema.parse(input.attributes);
      } catch {
        throw new BadRequestException('Invalid attributes format');
      }
    }

    // Check SKU uniqueness if changing
    if (input.sku && input.sku !== product.sku) {
      const existing = await this.prisma.product.findFirst({
        where: {
          tenantId,
          sku: input.sku,
          id: { not: id },
        },
      });

      if (existing) {
        throw new ConflictException('SKU already exists in this tenant');
      }
    }

    return this.prisma.product.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.sku !== undefined && { sku: input.sku }),
        ...(input.priceCents !== undefined && { priceCents: input.priceCents }),
        ...(input.currency && { currency: input.currency }),
        ...(input.categoryId !== undefined && { categoryId: input.categoryId }),
        ...(input.attributes && { attributes: input.attributes as ProductAttributes }),
        ...(input.fiscal !== undefined && { fiscal: input.fiscal }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  }

  async delete(id: string, tenantId: string) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.prisma.product.delete({ where: { id } });
    return { success: true };
  }

  async updateImages(id: string, tenantId: string, images: string[]) {
    const product = await this.prisma.product.findFirst({
      where: { id, tenantId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.prisma.product.update({
      where: { id },
      data: { images },
    });
  }
}
