import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AttributeTemplate } from '@product-catalog/shared';

interface CreateCategoryInput {
  name: string;
  parentId?: string;
  attributeTemplate?: AttributeTemplate[];
}

interface UpdateCategoryInput {
  name?: string;
  parentId?: string;
  attributeTemplate?: AttributeTemplate[];
}

@Injectable()
export class CategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tenantId: string, input: CreateCategoryInput) {
    // Validate parent exists if provided
    if (input.parentId) {
      const parent = await this.prisma.category.findFirst({
        where: { id: input.parentId, tenantId },
      });

      if (!parent) {
        throw new NotFoundException('Parent category not found');
      }

      // Prevent circular references
      if (input.parentId === tenantId) {
        throw new BadRequestException('Category cannot be its own parent');
      }
    }

    return this.prisma.category.create({
      data: {
        tenantId,
        name: input.name,
        parentId: input.parentId,
        attributeTemplate: input.attributeTemplate || null,
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async findAll(tenantId: string, includeProducts = false) {
    const categories = await this.prisma.category.findMany({
      where: { tenantId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            products: includeProducts ? true : false,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    return categories;
  }

  async findTree(tenantId: string) {
    const allCategories = await this.prisma.category.findMany({
      where: { tenantId },
      include: {
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    // Build tree structure
    const categoryMap = new Map();
    const rootCategories: any[] = [];

    // First pass: create map
    allCategories.forEach((cat) => {
      categoryMap.set(cat.id, {
        ...cat,
        children: [],
      });
    });

    // Second pass: build tree
    allCategories.forEach((cat) => {
      const categoryNode = categoryMap.get(cat.id);
      if (cat.parentId) {
        const parent = categoryMap.get(cat.parentId);
        if (parent) {
          parent.children.push(categoryNode);
        } else {
          rootCategories.push(categoryNode);
        }
      } else {
        rootCategories.push(categoryNode);
      }
    });

    return rootCategories;
  }

  async findById(id: string, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  async update(id: string, tenantId: string, input: UpdateCategoryInput) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Validate parent exists if changing
    if (input.parentId !== undefined) {
      if (input.parentId === id) {
        throw new BadRequestException('Category cannot be its own parent');
      }

      if (input.parentId) {
        const parent = await this.prisma.category.findFirst({
          where: { id: input.parentId, tenantId },
        });

        if (!parent) {
          throw new NotFoundException('Parent category not found');
        }

        // Check for circular reference
        let current = parent;
        while (current.parentId) {
          if (current.parentId === id) {
            throw new BadRequestException('Circular reference detected');
          }
          current = await this.prisma.category.findFirst({
            where: { id: current.parentId, tenantId },
          });
          if (!current) break;
        }
      }
    }

    return this.prisma.category.update({
      where: { id },
      data: {
        ...(input.name && { name: input.name }),
        ...(input.parentId !== undefined && { parentId: input.parentId }),
        ...(input.attributeTemplate !== undefined && {
          attributeTemplate: input.attributeTemplate,
        }),
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
          },
        },
        children: {
          select: {
            id: true,
            name: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
    });
  }

  async delete(id: string, tenantId: string) {
    const category = await this.prisma.category.findFirst({
      where: { id, tenantId },
      include: {
        _count: {
          select: {
            products: true,
            children: true,
          },
        },
      },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    if (category._count.products > 0) {
      throw new BadRequestException(
        'Cannot delete category with products. Please reassign or delete products first.',
      );
    }

    if (category._count.children > 0) {
      throw new BadRequestException(
        'Cannot delete category with subcategories. Please delete or reassign subcategories first.',
      );
    }

    await this.prisma.category.delete({ where: { id } });
    return { success: true };
  }
}
