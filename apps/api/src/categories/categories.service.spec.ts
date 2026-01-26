import { Test, TestingModule } from '@nestjs/testing';
import { CategoriesService } from './categories.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    category: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    product: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoriesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<CategoriesService>(CategoriesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a category successfully', async () => {
      const tenantId = 'tenant1';
      const createDto = {
        name: 'Electronics',
        parentId: null,
        attributeTemplate: { color: 'string', size: 'string' },
      };

      const mockCategory = {
        id: 'cat1',
        tenantId,
        ...createDto,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.category.create.mockResolvedValue(mockCategory);

      const result = await service.create(tenantId, createDto);

      expect(result).toEqual(mockCategory);
      expect(mockPrismaService.category.create).toHaveBeenCalledWith({
        data: {
          tenantId,
          name: createDto.name,
          parentId: null,
          attributeTemplate: createDto.attributeTemplate,
        },
      });
    });

    it('should validate parent category belongs to same tenant', async () => {
      const tenantId = 'tenant1';
      const createDto = {
        name: 'Phones',
        parentId: 'parentCat1',
      };

      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(service.create(tenantId, createDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('should return all categories for a tenant', async () => {
      const tenantId = 'tenant1';
      const mockCategories = [
        { id: 'cat1', name: 'Electronics', tenantId },
        { id: 'cat2', name: 'Clothing', tenantId },
      ];

      mockPrismaService.category.findMany.mockResolvedValue(mockCategories);

      const result = await service.findAll(tenantId);

      expect(result).toEqual(mockCategories);
      expect(mockPrismaService.category.findMany).toHaveBeenCalledWith({
        where: { tenantId },
        include: expect.any(Object),
        orderBy: expect.any(Object),
      });
    });
  });

  describe('findById', () => {
    it('should return a category by id', async () => {
      const id = 'cat1';
      const tenantId = 'tenant1';
      const mockCategory = { id, name: 'Electronics', tenantId };

      mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);

      const result = await service.findById(id, tenantId);

      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException if category not found', async () => {
      mockPrismaService.category.findFirst.mockResolvedValue(null);

      await expect(service.findById('invalid', 'tenant1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('delete', () => {
    it('should delete a category without products or children', async () => {
      const id = 'cat1';
      const tenantId = 'tenant1';
      const mockCategory = { id, name: 'Electronics', tenantId };

      mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.category.count.mockResolvedValue(0);
      mockPrismaService.category.delete.mockResolvedValue(mockCategory);

      await service.delete(id, tenantId);

      expect(mockPrismaService.category.delete).toHaveBeenCalledWith({
        where: { id },
      });
    });

    it('should throw BadRequestException if category has products', async () => {
      const id = 'cat1';
      const tenantId = 'tenant1';
      const mockCategory = { id, name: 'Electronics', tenantId };

      mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaService.product.count.mockResolvedValue(5);

      await expect(service.delete(id, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if category has children', async () => {
      const id = 'cat1';
      const tenantId = 'tenant1';
      const mockCategory = { id, name: 'Electronics', tenantId };

      mockPrismaService.category.findFirst.mockResolvedValue(mockCategory);
      mockPrismaService.product.count.mockResolvedValue(0);
      mockPrismaService.category.count.mockResolvedValue(3);

      await expect(service.delete(id, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
