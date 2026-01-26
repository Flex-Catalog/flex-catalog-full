import { Injectable } from '@nestjs/common';
import { InvoiceProvider } from '../invoice-provider.interface';
import { CountryCode, InvoicePayload, InvoiceResult } from '@product-catalog/shared';

@Injectable()
export class USProvider implements InvoiceProvider {
  supportsCountry(country: CountryCode): boolean {
    return country === 'US';
  }

  async issue(payload: InvoicePayload, tenantId: string): Promise<InvoiceResult> {
    // Stub implementation - returns basic invoice
    const invoiceNumber = `US-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return {
      invoiceNumber,
      issuedAt: new Date(),
      pdfUrl: `https://example.com/invoices/${invoiceNumber}.pdf`,
    };
  }
}
