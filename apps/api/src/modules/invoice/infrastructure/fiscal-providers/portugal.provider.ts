import { Injectable } from '@nestjs/common';
import { Result, ValidationError } from '../../../../@core/domain/result';
import { IFiscalProvider, FiscalProviderResult } from '../../domain/services/fiscal-provider.interface';

/**
 * Portugal Fatura Provider
 * - SRP: Only handles Portuguese invoices (faturas)
 */
@Injectable()
export class PortugalFiscalProvider implements IFiscalProvider {
  private readonly supportedCountryCodes = ['PT', 'PRT', 'PORTUGAL'] as const;

  supportedCountries(): readonly string[] {
    return this.supportedCountryCodes;
  }

  supportsCountry(country: string): boolean {
    return this.supportedCountryCodes.includes(country.toUpperCase() as any);
  }

  validate(payload: Record<string, unknown>): Result<void, Error> {
    const errors: string[] = [];

    // Portuguese invoice requirements
    if (!payload.customer) {
      errors.push('Customer is required');
    } else {
      const customer = payload.customer as Record<string, unknown>;
      if (!customer.nif && !customer.taxId) {
        errors.push('Customer NIF/Tax ID is required');
      }
      if (!customer.name) {
        errors.push('Customer name is required');
      }
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
      // Generate Portuguese invoice number (Fatura)
      const year = new Date().getFullYear();
      const sequence = Math.floor(Math.random() * 100000);
      const faturaNumber = `FT ${year}/${sequence.toString().padStart(5, '0')}`;

      // ATCUD (unique document code for Portuguese tax authority)
      const atcud = `${tenantId.substring(0, 8)}-${sequence}`;

      return Result.ok({
        success: true,
        data: Object.freeze({
          faturaNumber,
          atcud,
          qrCode: `https://faturas.portaldasfinancas.gov.pt/v/${atcud}`,
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
