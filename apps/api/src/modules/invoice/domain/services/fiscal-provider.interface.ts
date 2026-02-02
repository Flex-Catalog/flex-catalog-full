import { Result } from '../../../../@core/domain/result';

/**
 * Fiscal Provider Result
 * - Immutable response from fiscal API
 */
export interface FiscalProviderResult {
  readonly success: boolean;
  readonly error?: string;
  readonly data?: Readonly<Record<string, unknown>>;
}

/**
 * Fiscal Provider Interface
 * - SRP: Only handles fiscal document issuance
 * - Dependency Inversion: Abstract interface
 * - Strategy Pattern: Different implementations per country
 */
export interface IFiscalProvider {
  /**
   * Returns supported country codes
   */
  supportedCountries(): readonly string[];

  /**
   * Checks if provider supports country
   */
  supportsCountry(country: string): boolean;

  /**
   * Issues fiscal document
   * - Pure: Returns Result instead of throwing
   */
  issue(payload: Record<string, unknown>, tenantId: string): Promise<Result<FiscalProviderResult, Error>>;

  /**
   * Validates payload before issuing
   */
  validate(payload: Record<string, unknown>): Result<void, Error>;
}

/**
 * Fiscal Provider Registry Token
 */
export const FISCAL_PROVIDER_REGISTRY = Symbol('FISCAL_PROVIDER_REGISTRY');

/**
 * Fiscal Provider Registry Interface
 * - Factory: Returns appropriate provider for country
 */
export interface IFiscalProviderRegistry {
  getProvider(country: string): IFiscalProvider | null;
  getSupportedCountries(): string[];
}
