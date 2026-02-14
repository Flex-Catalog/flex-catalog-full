import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BillingService } from './billing.service';
import { BillingController } from './billing.controller';
import { StripeWebhookController } from './stripe-webhook.controller';
import { TenantsModule } from '../tenants/tenants.module';
import { AffiliateModule } from '../modules/affiliate/affiliate.module';

@Module({
  imports: [ConfigModule, forwardRef(() => TenantsModule), AffiliateModule],
  controllers: [BillingController, StripeWebhookController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
