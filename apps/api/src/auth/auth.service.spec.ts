import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { BillingService } from '../billing/billing.service';
import { UnauthorizedException, ConflictException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: PrismaService;
  let tenantsService: TenantsService;
  let billingService: BillingService;

  const mockPrismaService = {
    tenant: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    user: {
      create: jest.fn(),
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockTenantsService = {
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockBillingService = {
    createCheckoutSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: TenantsService,
          useValue: mockTenantsService,
        },
        {
          provide: BillingService,
          useValue: mockBillingService,
        },
        {
          provide: 'JWT_MODULE_OPTIONS',
          useValue: {
            secret: 'test-secret',
            signOptions: { expiresIn: '15m' },
          },
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    prisma = module.get<PrismaService>(PrismaService);
    tenantsService = module.get<TenantsService>(TenantsService);
    billingService = module.get<BillingService>(BillingService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    it('should register a new tenant and user', async () => {
      const input = {
        name: 'Test User',
        email: 'test@example.com',
        password: 'password123',
        companyName: 'Test Company',
        country: 'BR',
      };

      const mockTenant = { id: 'tenant1', name: 'Test Company' };
      const mockUser = { id: 'user1', email: 'test@example.com' };

      mockTenantsService.create.mockResolvedValue(mockTenant);
      mockPrismaService.user.create.mockResolvedValue(mockUser);
      mockBillingService.createCheckoutSession.mockResolvedValue(
        'https://checkout.stripe.com/test',
      );

      const result = await service.register(input);

      expect(result).toHaveProperty('checkoutUrl');
      expect(mockTenantsService.create).toHaveBeenCalled();
      expect(mockPrismaService.user.create).toHaveBeenCalled();
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await argon2.hash(password);

      const mockUser = {
        id: 'user1',
        email,
        passwordHash: hashedPassword,
        tenantId: 'tenant1',
        roles: ['TENANT_ADMIN'],
        tenant: { status: 'ACTIVE' },
      };

      mockPrismaService.user.findFirst.mockResolvedValue(mockUser);

      const result = await service.login(email, password);

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      mockPrismaService.user.findFirst.mockResolvedValue(null);

      await expect(
        service.login('test@example.com', 'wrongpassword'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
