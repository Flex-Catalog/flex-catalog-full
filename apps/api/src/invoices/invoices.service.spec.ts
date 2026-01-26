import { Test, TestingModule } from '@nestjs/testing';
import { InvoicesService } from './invoices.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('InvoicesService', () => {
  let service: InvoicesService;
  let prisma: PrismaService;

  const mockPrismaService = {
    invoice: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvoicesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<InvoicesService>(InvoicesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an invoice in DRAFT status', async () => {
      const tenantId = 'tenant1';
      const createDto = {
        country: 'US',
        payload: {
          customer: { name: 'John Doe', taxId: '123456789' },
          items: [
            { description: 'Product A', quantity: 2, unitPriceCents: 1000 },
          ],
        },
      };

      const mockInvoice = {
        id: 'inv1',
        tenantId,
        country: 'US',
        status: 'DRAFT',
        payload: createDto.payload,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrismaService.invoice.create.mockResolvedValue(mockInvoice);

      const result = await service.create(tenantId, createDto);

      expect(result).toEqual(mockInvoice);
      expect(result.status).toBe('DRAFT');
    });
  });

  describe('findAll', () => {
    it('should return all invoices for a tenant', async () => {
      const tenantId = 'tenant1';
      const mockInvoices = [
        { id: 'inv1', status: 'DRAFT', tenantId },
        { id: 'inv2', status: 'ISSUED', tenantId },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await service.findAll(tenantId);

      expect(result).toEqual(mockInvoices);
    });
  });

  describe('issue', () => {
    it('should issue an invoice successfully', async () => {
      const id = 'inv1';
      const tenantId = 'tenant1';

      const mockInvoice = {
        id,
        tenantId,
        country: 'US',
        status: 'DRAFT',
        payload: {
          customer: { name: 'John Doe', taxId: '123456789' },
          items: [{ description: 'Product A', quantity: 1, unitPriceCents: 1000 }],
        },
      };

      mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'ISSUED',
        result: { invoiceNumber: 'INV-001', status: 'success' },
      });

      const result = await service.issue(id, tenantId);

      expect(result.status).toBe('ISSUED');
      expect(result.result).toBeDefined();
    });

    it('should throw BadRequestException if invoice is not in DRAFT status', async () => {
      const id = 'inv1';
      const tenantId = 'tenant1';

      mockPrismaService.invoice.findFirst.mockResolvedValue({
        id,
        tenantId,
        status: 'ISSUED',
      });

      await expect(service.issue(id, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if invoice not found', async () => {
      mockPrismaService.invoice.findFirst.mockResolvedValue(null);

      await expect(service.issue('invalid', 'tenant1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('cancel', () => {
    it('should cancel an invoice in DRAFT status', async () => {
      const id = 'inv1';
      const tenantId = 'tenant1';

      const mockInvoice = { id, tenantId, status: 'DRAFT' };

      mockPrismaService.invoice.findFirst.mockResolvedValue(mockInvoice);
      mockPrismaService.invoice.update.mockResolvedValue({
        ...mockInvoice,
        status: 'CANCELED',
      });

      const result = await service.cancel(id, tenantId);

      expect(result.status).toBe('CANCELED');
    });

    it('should throw BadRequestException if trying to cancel ISSUED invoice', async () => {
      const id = 'inv1';
      const tenantId = 'tenant1';

      mockPrismaService.invoice.findFirst.mockResolvedValue({
        id,
        tenantId,
        status: 'ISSUED',
      });

      await expect(service.cancel(id, tenantId)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
