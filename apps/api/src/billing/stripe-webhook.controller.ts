import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { BillingService } from './billing.service';
import { Public } from '../common/decorators';

@ApiTags('Billing')
@Controller('billing')
export class StripeWebhookController {
  constructor(private readonly billingService: BillingService) {}

  @Post('webhook')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async handleWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    const rawBody = req.body;

    if (!Buffer.isBuffer(rawBody)) {
      throw new BadRequestException('Request body must be raw buffer');
    }

    try {
      const event = this.billingService.constructEvent(rawBody, signature);
      await this.billingService.handleWebhookEvent(event);
      return { received: true };
    } catch (err) {
      console.error('Webhook error:', err);
      throw new BadRequestException(`Webhook Error: ${(err as Error).message}`);
    }
  }
}
