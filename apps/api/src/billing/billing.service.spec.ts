import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { BillingService } from './billing.service';
import { TenantsService } from '../tenants/tenants.service';
import Stripe from 'stripe';

describe('BillingService', () => {
  let service: BillingService;
  let tenantsService: TenantsService;
  let configService: ConfigService;

  const mockTenantsService = {
    findById: jest.fn(),
    findByStripeCustomerId: jest.fn(),
    updateStripeInfo: jest.fn(),
    updateStatus: jest.fn(),
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      const config: Record<string, string> = {
        STRIPE_SECRET_KEY: 'sk_test_mock',
        STRIPE_PRICE_ID: 'price_mock',
        STRIPE_WEBHOOK_SECRET: 'whsec_mock',
        FRONTEND_URL: 'http://localhost:3000',
      };
      return config[key];
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BillingService,
        {
          provide: TenantsService,
          useValue: mockTenantsService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();

    service = module.get<BillingService>(BillingService);
    tenantsService = module.get<TenantsService>(TenantsService);
    configService = module.get<ConfigService>(ConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handleWebhookEvent', () => {
    it('should activate tenant on checkout.session.completed', async () => {
      const event: Partial<Stripe.Event> = {
        type: 'checkout.session.completed',
        data: {
          object: {
            id: 'cs_test_123',
            metadata: { tenantId: 'tenant1' },
            customer: 'cus_123',
            subscription: 'sub_123',
          } as any,
        },
      };

      // Mock stripe subscription retrieval
      (service as any).stripe = {
        subscriptions: {
          retrieve: jest.fn().mockResolvedValue({
            id: 'sub_123',
            current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
          }),
        },
      };

      mockTenantsService.updateStripeInfo.mockResolvedValue({});

      await service.handleWebhookEvent(event as Stripe.Event);

      expect(mockTenantsService.updateStripeInfo).toHaveBeenCalledWith(
        'tenant1',
        expect.objectContaining({
          stripeCustomerId: 'cus_123',
          stripeSubscriptionId: 'sub_123',
          status: 'ACTIVE',
        }),
      );
    });

    it('should mark tenant as PAST_DUE on invoice.payment_failed', async () => {
      const event: Partial<Stripe.Event> = {
        type: 'invoice.payment_failed',
        data: {
          object: {
            id: 'in_test_123',
            customer: 'cus_123',
          } as any,
        },
      };

      mockTenantsService.findByStripeCustomerId.mockResolvedValue({
        id: 'tenant1',
      });
      mockTenantsService.updateStatus.mockResolvedValue({});

      await service.handleWebhookEvent(event as Stripe.Event);

      expect(mockTenantsService.updateStatus).toHaveBeenCalledWith(
        'tenant1',
        'PAST_DUE',
      );
    });

    it('should mark tenant as CANCELED on customer.subscription.deleted', async () => {
      const event: Partial<Stripe.Event> = {
        type: 'customer.subscription.deleted',
        data: {
          object: {
            id: 'sub_123',
            customer: 'cus_123',
          } as any,
        },
      };

      mockTenantsService.findByStripeCustomerId.mockResolvedValue({
        id: 'tenant1',
      });
      mockTenantsService.updateStripeInfo.mockResolvedValue({});

      await service.handleWebhookEvent(event as Stripe.Event);

      expect(mockTenantsService.updateStripeInfo).toHaveBeenCalledWith(
        'tenant1',
        expect.objectContaining({ status: 'CANCELED' }),
      );
    });
  });

  describe('createPortalSession', () => {
    it('should throw error if no Stripe customer found', async () => {
      mockTenantsService.findById.mockResolvedValue({
        id: 'tenant1',
        stripeCustomerId: null,
      });

      await expect(service.createPortalSession('tenant1')).rejects.toThrow(
        'No Stripe customer found',
      );
    });
  });
});
