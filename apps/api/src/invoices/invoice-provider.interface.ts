import { CountryCode } from '@product-catalog/shared';
import { InvoicePayload, InvoiceResult } from '@product-catalog/shared';

export interface InvoiceProvider {
  supportsCountry(country: CountryCode): boolean;
  issue(payload: InvoicePayload, tenantId: string): Promise<InvoiceResult>;
}
