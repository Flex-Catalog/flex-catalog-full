import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { TenantsService } from '../tenants/tenants.service';
import { UsersService } from '../users/users.service';
import { BillingService } from '../billing/billing.service';
import { EmailService } from '../email/email.service';
import { AffiliateService } from '../modules/affiliate/affiliate.service';
import { UnauthorizedException } from '@nestjs/common';
import * as argon2 from 'argon2';

describe('AuthService', () => {
  let service: AuthService;

  const mockPrismaService = {
    tenant: { create: jest.fn(), findUnique: jest.fn() },
    user: { create: jest.fn(), findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
    coupon: { findUnique: jest.fn(), update: jest.fn() },
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
    findByTaxId: jest.fn(),
  };

  const mockUsersService = {
    findByEmail: jest.fn(),
    findByEmailGlobal: jest.fn(),
    create: jest.fn(),
    updateRefreshToken: jest.fn(),
  };

  const mockBillingService = {
    createCheckoutSession: jest.fn(),
    getOrCreateIntroductoryCoupon: jest.fn(),
    createStripeCoupon: jest.fn(),
  };

  const mockEmailService = {
    sendVerificationEmail: jest.fn().mockResolvedValue(undefined),
  };

  const mockAffiliateService = {
    linkAffiliate: jest.fn().mockResolvedValue(undefined),
    activateByInviteToken: jest.fn().mockResolvedValue(undefined),
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
        { provide: EmailService, useValue: mockEmailService },
        { provide: AffiliateService, useValue: mockAffiliateService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('register', () => {
    const input = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      companyName: 'Test Company',
      country: 'BR',
    };

    it('should register with trial status and introductory discount', async () => {
      const mockTenant = { id: 'tenant1', name: 'Test Company', status: 'TRIAL' };

      mockUsersService.findByEmailGlobal.mockResolvedValue(null);
      mockTenantsService.create.mockResolvedValue(mockTenant);
      mockUsersService.create.mockResolvedValue({
        id: 'user1',
        email: input.email,
        name: input.name,
        roles: ['TENANT_ADMIN'],
        tenantId: mockTenant.id,
      });
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);
      mockBillingService.getOrCreateIntroductoryCoupon.mockResolvedValue('FLEX_INTRO_50');
      mockBillingService.createCheckoutSession.mockResolvedValue(
        'https://checkout.stripe.com/test',
      );

      const result = await service.register(input);

      expect(result.checkoutUrl).toBe('https://checkout.stripe.com/test');
      expect(result.tenant.status).toBe('TRIAL');
      expect(mockTenantsService.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'TRIAL' }),
      );
      expect(mockBillingService.getOrCreateIntroductoryCoupon).toHaveBeenCalled();
      expect(mockBillingService.createCheckoutSession).toHaveBeenCalledWith(
        'tenant1',
        input.email,
        { trialDays: 61, stripeCouponId: 'FLEX_INTRO_50' },
      );
    });

    it('should check tax ID uniqueness', async () => {
      mockUsersService.findByEmailGlobal.mockResolvedValue(null);
      mockTenantsService.findByTaxId.mockResolvedValue({ id: 'existing-tenant' });

      await expect(
        service.register({ ...input, taxId: '12.345.678/0001-90' }),
      ).rejects.toThrow('Tax ID already registered');
    });

    it('should validate coupon code when provided', async () => {
      const mockTenant = { id: 'tenant1', name: 'Test Company', status: 'TRIAL' };
      const mockCoupon = {
        id: 'coupon1',
        code: 'SAVE20',
        discountPercent: 20,
        durationMonths: 3,
        isActive: true,
        maxUses: 100,
        currentUses: 5,
        expiresAt: null,
      };

      mockUsersService.findByEmailGlobal.mockResolvedValue(null);
      mockTenantsService.findByTaxId.mockResolvedValue(null);
      mockPrismaService.coupon.findUnique.mockResolvedValue(mockCoupon);
      mockTenantsService.create.mockResolvedValue(mockTenant);
      mockUsersService.create.mockResolvedValue({
        id: 'user1',
        email: input.email,
        name: input.name,
        roles: ['TENANT_ADMIN'],
        tenantId: mockTenant.id,
      });
      mockUsersService.updateRefreshToken.mockResolvedValue(undefined);
      mockBillingService.createStripeCoupon.mockResolvedValue('FLEX_SAVE20');
      mockPrismaService.coupon.update.mockResolvedValue(mockCoupon);
      mockBillingService.createCheckoutSession.mockResolvedValue(
        'https://checkout.stripe.com/test',
      );

      const result = await service.register({
        ...input,
        taxId: '123456789',
        couponCode: 'SAVE20',
      });

      expect(result.checkoutUrl).toBeDefined();
      expect(mockBillingService.createStripeCoupon).toHaveBeenCalledWith('SAVE20', 20, 3);
      expect(mockPrismaService.coupon.update).toHaveBeenCalledWith({
        where: { id: 'coupon1' },
        data: { currentUses: { increment: 1 } },
      });
    });
  });

  describe('login', () => {
    it('should login successfully with valid credentials', async () => {
      const email = 'test@example.com';
      const password = 'password123';
      const hashedPassword = await argon2.hash(password);

      mockUsersService.findByEmailGlobal.mockResolvedValue({
        id: 'user1',
        email,
        passwordHash: hashedPassword,
        tenantId: 'tenant1',
        roles: ['TENANT_ADMIN'],
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
