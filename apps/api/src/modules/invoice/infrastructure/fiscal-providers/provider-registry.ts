import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { IFiscalProvider, IFiscalProviderRegistry } from '../../domain/services/fiscal-provider.interface';
import { BrazilFiscalProvider } from './brazil.provider';
import { USFiscalProvider } from './us.provider';
import { PortugalFiscalProvider } from './portugal.provider';

/**
 * Fiscal Provider Registry
 * - Factory: Returns appropriate provider for country
 * - SRP: Only manages provider lookup
 * - Open/Closed: New providers can be added without modification
 */
@Injectable()
export class FiscalProviderRegistry implements IFiscalProviderRegistry {
  private readonly providers: IFiscalProvider[];

  constructor(
    private readonly brazilProvider: BrazilFiscalProvider,
    private readonly usProvider: USFiscalProvider,
    private readonly portugalProvider: PortugalFiscalProvider,
  ) {
    this.providers = [brazilProvider, usProvider, portugalProvider];
  }

  /**
   * Gets provider for country
   * - Pure lookup function
   */
  getProvider(country: string): IFiscalProvider | null {
    const normalizedCountry = country.toUpperCase().trim();
    return this.providers.find((p) => p.supportsCountry(normalizedCountry)) ?? null;
  }

  /**
   * Gets all supported countries
   */
  getSupportedCountries(): string[] {
    const countries = new Set<string>();
    for (const provider of this.providers) {
      for (const country of provider.supportedCountries()) {
        countries.add(country);
      }
    }
    return [...countries];
  }
}
