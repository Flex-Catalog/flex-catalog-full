import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { TenantsService } from '../tenants/tenants.service';
import { AffiliateService } from '../modules/affiliate/affiliate.service';

@Injectable()
export class BillingService {
  private stripe: Stripe;
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
  }

  /**
   * Returns the Stripe price ID for the given locale.
   * Locale 'pt' → BRL (R$ 2.500), 'es' → EUR (€ 470), default → USD ($500)
   */
  private getPriceIdByLocale(locale: string): string {
    const localeMap: Record<string, string> = {
      pt: this.configService.get<string>('STRIPE_PRICE_ID_BRL') || '',
      es: this.configService.get<string>('STRIPE_PRICE_ID_EUR') || '',
      en: this.configService.get<string>('STRIPE_PRICE_ID_USD') || '',
    };
    return localeMap[locale] || localeMap['en'] || '';
  }

  async createCheckoutSession(
    tenantId: string,
    email: string,
    options?: { trialDays?: number; stripeCouponId?: string; locale?: string },
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

    const priceId = this.getPriceIdByLocale(options?.locale || 'en');

    // Build checkout session params
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
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
   * Get or create the standard 50% introductory coupon on Stripe (3 months).
   */
  async getOrCreateIntroductoryCoupon(): Promise<string> {
    const couponId = 'FLEX_INTRO_50_3M';
    try {
      await this.stripe.coupons.retrieve(couponId);
      return couponId;
    } catch {
      const coupon = await this.stripe.coupons.create({
        id: couponId,
        percent_off: 50,
        duration: 'repeating',
        duration_in_months: 3,
        name: 'FlexCatalog 50% Introductory Discount (3 months)',
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

  /**
   * Create a SetupIntent for Stripe Payment Elements.
   * Used on the payment wall when trial expires or subscription is past due.
   */
  async createSetupIntent(tenantId: string, email: string): Promise<{ clientSecret: string }> {
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

    const setupIntent = await this.stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
      metadata: { tenantId },
    });

    return { clientSecret: setupIntent.client_secret! };
  }

  /**
   * Create a subscription using a previously collected payment method (from SetupIntent).
   * Used after the user completes payment on the payment wall.
   */
  async createSubscriptionFromSetup(
    tenantId: string,
    email: string,
    options?: { stripeCouponId?: string; locale?: string },
  ): Promise<{ subscriptionId: string; clientSecret?: string }> {
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

    // Get the customer's default payment method
    const customer = await this.stripe.customers.retrieve(customerId) as Stripe.Customer;
    const defaultPm = customer.invoice_settings?.default_payment_method;

    // If no default PM, get the latest one
    let paymentMethodId = defaultPm as string | undefined;
    if (!paymentMethodId) {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: customerId,
        type: 'card',
        limit: 1,
      });
      paymentMethodId = paymentMethods.data[0]?.id;
    }

    // Get the price for the user's locale
    const priceId = this.getPriceIdByLocale(options?.locale || 'en');

    const subscriptionParams: Stripe.SubscriptionCreateParams = {
      customer: customerId,
      items: [{ price: priceId }],
      default_payment_method: paymentMethodId,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['latest_invoice.payment_intent'],
      metadata: { tenantId },
    };

    if (options?.stripeCouponId) {
      subscriptionParams.discounts = [{ coupon: options.stripeCouponId }];
    }

    const subscription = await this.stripe.subscriptions.create(subscriptionParams);

    // Update tenant with subscription info
    await this.tenantsService.updateStripeInfo(tenantId, {
      stripeSubscriptionId: subscription.id,
      status: subscription.status === 'active' ? 'ACTIVE' : 'PENDING_PAYMENT',
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    });

    if (subscription.status === 'active') {
      await this.tenantsService.updateStripeInfo(tenantId, { status: 'ACTIVE' });
    }

    const invoice = subscription.latest_invoice as Stripe.Invoice;
    const paymentIntent = invoice?.payment_intent as Stripe.PaymentIntent;

    return {
      subscriptionId: subscription.id,
      clientSecret: paymentIntent?.client_secret || undefined,
    };
  }

  /**
   * Get tenant's subscription status details for the payment wall.
   */
  async getSubscriptionStatus(tenantId: string): Promise<{
    status: string;
    trialEndsAt?: string;
    currentPeriodEnd?: string;
    hasPaymentMethod: boolean;
  }> {
    const tenant = await this.tenantsService.findById(tenantId);
    if (!tenant) throw new Error('Tenant not found');

    let hasPaymentMethod = false;
    if (tenant.stripeCustomerId) {
      const paymentMethods = await this.stripe.paymentMethods.list({
        customer: tenant.stripeCustomerId,
        type: 'card',
        limit: 1,
      });
      hasPaymentMethod = paymentMethods.data.length > 0;
    }

    return {
      status: tenant.status,
      trialEndsAt: tenant.trialEndsAt?.toISOString(),
      currentPeriodEnd: tenant.currentPeriodEnd?.toISOString(),
      hasPaymentMethod,
    };
  }

  constructEvent(payload: Buffer, signature: string): Stripe.Event {
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET') || '';
    return this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
  }
}
