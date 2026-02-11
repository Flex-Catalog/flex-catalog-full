import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { BillingService } from '../billing/billing.service';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    tenant: { create: jest.fn(), findUnique: jest.fn() },
    user: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
  };

  const mockJwtService = {
    sign: jest.fn().mockReturnValue('mock-token'),
    signAsync: jest.fn().mockResolvedValue('mock-token'),
    verify: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        JWT_SECRET: 'test-secret',
        JWT_REFRESH_SECRET: 'test-refresh-secret',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key];
    }),
  };

  const mockTenantsService = {
    create: jest.fn(),
    findById: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findByEmailGlobal: jest.fn(),
    create: jest.fn(),
    updateRefreshToken: jest.fn(),
  };

  const mockBillingService = {
    createCheckoutSession: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: JwtService, useValue: mockJwtService },
        { provide: ConfigService, useValue: mockConfigService },
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: TenantsService, useValue: mockTenantsService },
        { provide: UsersService, useValue: mockUsersService },
        { provide: BillingService, useValue: mockBillingService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
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

      mockUsersService.findByEmailGlobal.mockResolvedValue(null);
      mockTenantsService.create.mockResolvedValue(mockTenant);
      mockUsersService.create.mockResolvedValue({
        ...mockUser,
        name: input.name,
        roles: ['TENANT_ADMIN'],
        tenantId: mockTenant.id,
      });
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);
      mockBillingService.createCheckoutSession.mockResolvedValue(
        'https://checkout.stripe.com/test',
      );

      const result = await service.register(input);

      expect(result).toHaveProperty('checkoutUrl');
      expect(mockTenantsService.create).toHaveBeenCalled();
      expect(mockUsersService.create).toHaveBeenCalled();
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

      mockUsersService.findByEmailGlobal.mockResolvedValue({
        ...mockUser,
        isActive: true,
        name: 'Test User',
      });
      mockTenantsService.findById.mockResolvedValue({
        id: 'tenant1',
        name: 'Test Company',
        status: 'ACTIVE',
      });
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);

      const result = await service.login({ email, password });

      expect(result.tokens).toHaveProperty('accessToken');
      expect(result.tokens).toHaveProperty('refreshToken');
    });

    it('should throw UnauthorizedException with invalid credentials', async () => {
      mockUsersService.findByEmailGlobal.mockResolvedValue(null);

      await expect(
        service.login({ email: 'test@example.com', password: 'wrongpassword' }),
      ).rejects.toThrow(UnauthorizedException);
    });
  });
});
