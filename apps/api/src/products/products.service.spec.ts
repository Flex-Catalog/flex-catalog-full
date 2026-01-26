import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: PrismaService;

  const mockPrismaService = {
    product: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a product successfully', async () => {
      const tenantId = 'tenant1';
      const input = {
        name: 'Test Product',
        sku: 'TEST-001',
        priceCents: 10000,
        currency: 'USD',
        attributes: { color: 'red', size: 'M' },
      };

      mockPrismaService.product.findFirst.mockResolvedValue(null);
      mockPrismaService.product.create.mockResolvedValue({
        id: 'product1',
        ...input,
        tenantId,
      });

      const result = await service.create(tenantId, input);

      expect(result).toBeDefined();
      expect(mockPrismaService.product.create).toHaveBeenCalled();
    });

    it('should throw ConflictException if SKU already exists', async () => {
      const tenantId = 'tenant1';
      const input = {
        name: 'Test Product',
        sku: 'TEST-001',
        priceCents: 10000,
      };

      mockPrismaService.product.findFirst.mockResolvedValue({
        id: 'existing',
        sku: 'TEST-001',
      });

      await expect(service.create(tenantId, input)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw BadRequestException for invalid attributes', async () => {
      const tenantId = 'tenant1';
      const input = {
        name: 'Test Product',
        priceCents: 10000,
        attributes: { invalid: () => {} }, // Invalid attribute type
      };

      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.create(tenantId, input)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findById', () => {
    it('should return a product by id', async () => {
      const product = {
        id: 'product1',
        tenantId: 'tenant1',
        name: 'Test Product',
      };

      mockPrismaService.product.findFirst.mockResolvedValue(product);

      const result = await service.findById('product1', 'tenant1');

      expect(result).toEqual(product);
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(
        service.findById('nonexistent', 'tenant1'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a product successfully', async () => {
      const existingProduct = {
        id: 'product1',
        tenantId: 'tenant1',
        name: 'Old Name',
        sku: 'OLD-001',
      };

      mockPrismaService.product.findFirst.mockResolvedValue(existingProduct);
      mockPrismaService.product.update.mockResolvedValue({
        ...existingProduct,
        name: 'New Name',
      });

      const result = await service.update('product1', 'tenant1', {
        name: 'New Name',
      });

      expect(result.name).toBe('New Name');
      expect(mockPrismaService.product.update).toHaveBeenCalled();
    });
  });

  describe('delete', () => {
    it('should delete a product successfully', async () => {
      const product = {
        id: 'product1',
        tenantId: 'tenant1',
      };

      mockPrismaService.product.findFirst.mockResolvedValue(product);
      mockPrismaService.product.delete.mockResolvedValue(product);

      const result = await service.delete('product1', 'tenant1');

      expect(result.success).toBe(true);
      expect(mockPrismaService.product.delete).toHaveBeenCalled();
    });

    it('should throw NotFoundException if product not found', async () => {
      mockPrismaService.product.findFirst.mockResolvedValue(null);

      await expect(service.delete('nonexistent', 'tenant1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
