import { Injectable } from '@nestjs/common';
import { Result, ValidationError } from '../../../../@core/domain/result';
import { IFiscalProvider, FiscalProviderResult } from '../../domain/services/fiscal-provider.interface';

/**
 * Brazil NFe Provider
 * - SRP: Only handles Brazilian fiscal documents
 * - Integration with Focus NFe API (mock for now)
 */
@Injectable()
export class BrazilFiscalProvider implements IFiscalProvider {
  private readonly supportedCountryCodes = ['BR', 'BRA', 'BRAZIL'] as const;

  supportedCountries(): readonly string[] {
    return this.supportedCountryCodes;
  }

  supportsCountry(country: string): boolean {
    return this.supportedCountryCodes.includes(country.toUpperCase() as any);
  }

  validate(payload: Record<string, unknown>): Result<void, Error> {
    const errors: string[] = [];

    // Validate required fields for NFe
    if (!payload.naturezaOperacao) {
      errors.push('naturezaOperacao is required');
    }

    if (!payload.destinatario) {
      errors.push('destinatario is required');
    } else {
      const dest = payload.destinatario as Record<string, unknown>;
      if (!dest.cpfCnpj && !dest.cnpj && !dest.cpf) {
        errors.push('destinatario.cpfCnpj is required');
      }
      if (!dest.nome) {
        errors.push('destinatario.nome is required');
      }
    }

    if (!payload.itens || !Array.isArray(payload.itens) || payload.itens.length === 0) {
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
    // Validate first
    const validation = this.validate(payload);
    if (validation.isFailure) {
      return Result.ok({
        success: false,
        error: validation.error.message,
      } as FiscalProviderResult);
    }

    try {
      // Mock Focus NFe API call
      // In production, this would call the actual API
      const mockResponse = await this.callFocusNFeAPI(payload, tenantId);

      if (mockResponse.error) {
        return Result.ok({
          success: false,
          error: mockResponse.error as string,
        } as FiscalProviderResult);
      }

      return Result.ok({
        success: true,
        data: Object.freeze({
          chaveNfe: mockResponse.chaveNfe,
          numeroNfe: mockResponse.numeroNfe,
          serieNfe: mockResponse.serieNfe,
          dataEmissao: mockResponse.dataEmissao,
          urlDanfe: mockResponse.urlDanfe,
          xmlBase64: mockResponse.xmlBase64,
          protocolo: mockResponse.protocolo,
        }),
      } as FiscalProviderResult);
    } catch (error) {
      return Result.ok({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as FiscalProviderResult);
    }
  }

  /**
   * Mock API call - Replace with actual Focus NFe integration
   */
  private async callFocusNFeAPI(
    payload: Record<string, unknown>,
    tenantId: string,
  ): Promise<Record<string, unknown>> {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Generate mock NFe data
    const timestamp = Date.now();
    const chaveNfe = `35${timestamp.toString().substring(0, 12)}55001${'0'.repeat(9)}${Math.floor(Math.random() * 1000000000)
      .toString()
      .padStart(9, '0')}1`;

    return {
      chaveNfe,
      numeroNfe: Math.floor(Math.random() * 100000),
      serieNfe: '1',
      dataEmissao: new Date().toISOString(),
      urlDanfe: `https://nfe.example.com/danfe/${chaveNfe}`,
      xmlBase64: Buffer.from('<nfe>mock</nfe>').toString('base64'),
      protocolo: `135${timestamp}`,
    };
  }
}
