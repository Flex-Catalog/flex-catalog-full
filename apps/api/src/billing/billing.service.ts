import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { TenantsService } from '../tenants/tenants.service';
import { AffiliateService } from '../modules/affiliate/affiliate.service';

@Injectable()
export class BillingService {
  private stripe: Stripe;
  private readonly priceId: string;
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantsService: TenantsService,
    private readonly affiliateService: AffiliateService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
      { apiVersion: '2024-12-18.acacia' as any },
    );
    this.priceId = this.configService.get<string>('STRIPE_PRICE_ID') || '';
  }

  async createCheckoutSession(
    tenantId: string,
    email: string,
    options?: { trialDays?: number; stripeCouponId?: string },
  ): Promise<string> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    // Create or get Stripe customer
    const tenant = await this.tenantsService.findById(tenantId);
    let customerId = tenant?.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email,
        metadata: { tenantId },
      });
      customerId = customer.id;
      await this.tenantsService.updateStripeInfo(tenantId, { stripeCustomerId: customerId });
    }

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'FlexCatalog Pro',
              description: 'Monthly subscription',
            },
            unit_amount: 50000, // $500 in cents
            recurring: { interval: 'month' },
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendUrl}/app?checkout=success`,
      cancel_url: `${frontendUrl}/app?checkout=canceled`,
      metadata: { tenantId },
    };

    // Add trial period (2 months = ~61 days)
    if (options?.trialDays) {
      sessionParams.subscription_data = {
        trial_period_days: options.trialDays,
        metadata: { tenantId },
      };
    }

    // Add Stripe coupon for discount
    if (options?.stripeCouponId) {
      sessionParams.discounts = [{ coupon: options.stripeCouponId }];
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    return session.url || '';
  }

  /**
   * Get or create the standard 50% introductory coupon on Stripe (6 months).
   */
  async getOrCreateIntroductoryCoupon(): Promise<string> {
    const couponId = 'FLEX_INTRO_50';
    try {
      await this.stripe.coupons.retrieve(couponId);
      return couponId;
    } catch {
      const coupon = await this.stripe.coupons.create({
        id: couponId,
        percent_off: 50,
        duration: 'repeating',
        duration_in_months: 6,
        name: 'FlexCatalog 50% Introductory Discount',
      });
      return coupon.id;
    }
  }

  /**
   * Create a Stripe coupon from a custom platform coupon.
   */
  async createStripeCoupon(
    code: string,
    percentOff: number,
    durationMonths: number,
  ): Promise<string> {
    const stripeCouponId = `FLEX_${code}`;
    try {
      await this.stripe.coupons.retrieve(stripeCouponId);
      return stripeCouponId;
    } catch {
      const coupon = await this.stripe.coupons.create({
        id: stripeCouponId,
        percent_off: percentOff,
        duration: 'repeating',
        duration_in_months: durationMonths,
        name: `FlexCatalog Coupon: ${code}`,
      });
      return coupon.id;
    }
  }

  async createPortalSession(tenantId: string): Promise<string> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');
    const tenant = await this.tenantsService.findById(tenantId);

    if (!tenant?.stripeCustomerId) {
      throw new Error('No Stripe customer found');
    }

    const session = await this.stripe.billingPortal.sessions.create({
      customer: tenant.stripeCustomerId,
      return_url: `${frontendUrl}/app/billing`,
    });

    return session.url;
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const tenantId = session.metadata?.tenantId;

        if (tenantId && session.subscription) {
          const subscription = await this.stripe.subscriptions.retrieve(
            session.subscription as string,
          );

          const status = subscription.status === 'trialing' ? 'TRIAL' : 'ACTIVE';

          await this.tenantsService.updateStripeInfo(tenantId, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            status: status as any,
          });
        }
        break;
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        const tenant = await this.tenantsService.findByStripeCustomerId(
          subscription.customer as string,
        );

        if (tenant) {
          let status: 'TRIAL' | 'ACTIVE' | 'PAST_DUE' | 'CANCELED' = 'ACTIVE';

          if (subscription.status === 'trialing') {
            status = 'TRIAL';
          } else if (subscription.status === 'past_due') {
            status = 'PAST_DUE';
          } else if (subscription.status === 'canceled' || subscription.status === 'unpaid') {
            status = 'CANCELED';
          }

          await this.tenantsService.updateStripeInfo(tenant.id, {
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            status,
          });
        }
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        const tenant = await this.tenantsService.findByStripeCustomerId(
          subscription.customer as string,
        );

        if (tenant) {
          await this.tenantsService.updateStripeInfo(tenant.id, {
            status: 'CANCELED',
          });
        }
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        const tenant = await this.tenantsService.findByStripeCustomerId(
          invoice.customer as string,
        );

        if (tenant && invoice.amount_paid > 0) {
          // Process affiliate commissions on successful payment
          try {
            await this.affiliateService.processPaymentCommissions(
              tenant.id,
              invoice.amount_paid,
              invoice.id,
              invoice.period_start ? new Date(invoice.period_start * 1000) : undefined,
              invoice.period_end ? new Date(invoice.period_end * 1000) : undefined,
            );
          } catch (err) {
            this.logger.error(`Failed to process affiliate commissions for tenant ${tenant.id}`, err);
          }
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const tenant = await this.tenantsService.findByStripeCustomerId(
          invoice.customer as string,
        );

        if (tenant) {
          await this.tenantsService.updateStatus(tenant.id, 'PAST_DUE');
        }
        break;
      }
    }
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
