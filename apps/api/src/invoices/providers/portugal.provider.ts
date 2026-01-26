import { Injectable } from '@nestjs/common';
import { InvoiceProvider } from '../invoice-provider.interface';
import { CountryCode, InvoicePayload, InvoiceResult } from '@product-catalog/shared';

@Injectable()
export class PortugalProvider implements InvoiceProvider {
  supportsCountry(country: CountryCode): boolean {
    return country === 'PT';
  }

  async issue(payload: InvoicePayload, tenantId: string): Promise<InvoiceResult> {
    // Stub implementation - returns "not configured"
    return {
      error: 'Portugal fiscal provider not configured. Please configure AT integration.',
    };
  }
}
