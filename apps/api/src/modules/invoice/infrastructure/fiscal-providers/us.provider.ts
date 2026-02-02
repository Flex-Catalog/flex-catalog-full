import { Injectable } from '@nestjs/common';
import { Result, ValidationError } from '../../../../@core/domain/result';
import { IFiscalProvider, FiscalProviderResult } from '../../domain/services/fiscal-provider.interface';

/**
 * US Invoice Provider
 * - SRP: Only handles US invoices
 */
@Injectable()
export class USFiscalProvider implements IFiscalProvider {
  private readonly supportedCountryCodes = ['US', 'USA', 'UNITED STATES'] as const;

  supportedCountries(): readonly string[] {
    return this.supportedCountryCodes;
  }

  supportsCountry(country: string): boolean {
    return this.supportedCountryCodes.includes(country.toUpperCase() as any);
  }

  validate(payload: Record<string, unknown>): Result<void, Error> {
    const errors: string[] = [];

    if (!payload.recipientName && !payload.customer) {
      errors.push('Recipient name or customer is required');
    }

    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
      errors.push('At least one item is required');
    }

    if (errors.length > 0) {
      return Result.fail(new ValidationError(errors.join(', ')));
    }

    return Result.void();
  }

  async issue(
    payload: Record<string, unknown>,
    tenantId: string,
  ): Promise<Result<FiscalProviderResult, Error>> {
    const validation = this.validate(payload);
    if (validation.isFailure) {
      return Result.ok({
        success: false,
        error: validation.error.message,
      });
    }

    try {
      // US doesn't have mandatory fiscal requirements like Brazil
      // Generate a simple invoice number
      const invoiceNumber = `INV-${Date.now().toString(36).toUpperCase()}`;

      return Result.ok({
        success: true,
        data: Object.freeze({
          invoiceNumber,
          issuedAt: new Date().toISOString(),
          status: 'ISSUED',
        }),
      });
    } catch (error) {
      return Result.ok({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}
