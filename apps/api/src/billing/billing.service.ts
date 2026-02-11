import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { TenantsService } from '../tenants/tenants.service';

@Injectable()
export class BillingService {
  private stripe: Stripe;
  private readonly priceId: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly tenantsService: TenantsService,
  ) {
    this.stripe = new Stripe(
      this.configService.get<string>('STRIPE_SECRET_KEY') || '',
      { apiVersion: '2024-12-18.acacia' as any },
    );
    this.priceId = this.configService.get<string>('STRIPE_PRICE_ID') || '';
  }

  async createCheckoutSession(tenantId: string, email: string): Promise<string> {
    const frontendUrl = this.configService.get<string>('FRONTEND_URL');

    // Create or get Stripe customer
    let tenant = await this.tenantsService.findById(tenantId);
    let customerId = tenant?.stripeCustomerId;

    if (!customerId) {
      const customer = await this.stripe.customers.create({
        email,
        metadata: { tenantId },
      });
      customerId = customer.id;
      await this.tenantsService.updateStripeInfo(tenantId, { stripeCustomerId: customerId });
    }

    // Create checkout session
    const session = await this.stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: 'Product Catalog Pro',
              description: 'Monthly subscription - $500/month',
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
    });

    return session.url || '';
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

          await this.tenantsService.updateStripeInfo(tenantId, {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: subscription.id,
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
            status: 'ACTIVE',
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
          let status: 'ACTIVE' | 'PAST_DUE' | 'CANCELED' = 'ACTIVE';

          if (subscription.status === 'past_due') {
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
