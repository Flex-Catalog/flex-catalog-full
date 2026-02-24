import { Controller, Post, Get } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { BillingService } from './billing.service';
import { CurrentUser, RequirePermissions } from '../common/decorators';
import { AuthUser } from '@product-catalog/shared';
import { SetMetadata } from '@nestjs/common';
import { SKIP_TENANT_CHECK_KEY } from '../common/guards/tenant-status.guard';

const SkipTenantCheck = () => SetMetadata(SKIP_TENANT_CHECK_KEY, true);

@ApiTags('Billing')
@ApiBearerAuth()
@Controller('billing')
export class BillingController {
  constructor(private readonly billingService: BillingService) {}

  @Post('checkout')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Create Stripe Checkout session' })
  async createCheckout(@CurrentUser() user: AuthUser) {
    const url = await this.billingService.createCheckoutSession(
      user.tenantId,
      user.email,
    );
    return { url };
  }

  @Post('portal')
  @RequirePermissions('TENANT_MANAGE')
  @ApiOperation({ summary: 'Create Stripe Customer Portal session' })
  async createPortal(@CurrentUser() user: AuthUser) {
    const url = await this.billingService.createPortalSession(user.tenantId);
    return { url };
  }

  @Post('setup-intent')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Create Stripe SetupIntent for Payment Elements' })
  async createSetupIntent(@CurrentUser() user: AuthUser) {
    return this.billingService.createSetupIntent(user.tenantId, user.email);
  }

  @Post('subscribe')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Create subscription after payment method setup' })
  async createSubscription(@CurrentUser() user: AuthUser) {
    return this.billingService.createSubscriptionFromSetup(
      user.tenantId,
      user.email,
    );
  }

  @Get('status')
  @SkipTenantCheck()
  @ApiOperation({ summary: 'Get subscription status for payment wall' })
  async getStatus(@CurrentUser() user: AuthUser) {
    return this.billingService.getSubscriptionStatus(user.tenantId);
  }
}
