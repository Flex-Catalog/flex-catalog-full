import { Injectable, Logger } from '@nestjs/common';
import { InvoiceProvider } from '../invoice-provider.interface';
import { CountryCode, InvoicePayload, InvoiceResult } from '@product-catalog/shared';
import { NFeService, DadosEmitente } from '../nfe/services/nfe.service';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class BrazilProvider implements InvoiceProvider {
  private readonly logger = new Logger(BrazilProvider.name);

  constructor(
    private readonly nfeService: NFeService,
    private readonly prisma: PrismaService,
  ) {}

  supportsCountry(country: CountryCode): boolean {
    return country === 'BR';
  }

  async issue(payload: InvoicePayload, tenantId: string): Promise<InvoiceResult> {
    try {
      // Verifica se há dados do emitente no payload
      if (!payload.issuer) {
        // Tenta buscar dados fiscais do tenant
        const tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantId },
        });

        if (!tenant) {
          return {
            error: 'Tenant não encontrado',
          };
        }

        // Verifica se o tenant tem dados fiscais configurados
        // Por enquanto, retorna erro informativo
        return {
          error: 'Dados do emitente (issuer) não fornecidos no payload. ' +
            'Para emissão de NFe, é necessário informar os dados completos da empresa emissora.',
        };
      }

      // Converte dados do emitente para formato esperado pelo NFeService
      const dadosEmitente: DadosEmitente = {
        cnpj: payload.issuer.taxId,
        razaoSocial: payload.issuer.name,
        nomeFantasia: payload.issuer.tradeName,
        inscricaoEstadual: payload.issuer.stateRegistration || '',
        inscricaoMunicipal: payload.issuer.municipalRegistration,
        crt: payload.issuer.taxRegime || '1',
        endereco: {
          logradouro: payload.issuer.address.street,
          numero: payload.issuer.address.number,
          complemento: payload.issuer.address.complement,
          bairro: payload.issuer.address.neighborhood,
          codigoMunicipio: payload.issuer.address.cityCode || '',
          nomeMunicipio: payload.issuer.address.city,
          uf: payload.issuer.address.state,
          cep: payload.issuer.address.zipCode,
          telefone: payload.issuer.address.phone,
        },
      };

      // Converte payload para formato do NFeService
      const nfePayload: InvoicePayload = {
        ...payload,
        // Garante retrocompatibilidade
        customer: payload.customer || {
          name: payload.recipientName || '',
          taxId: payload.recipientTaxId || '',
        },
      };

      // Emite NFe
      const resultado = await this.nfeService.emitirDePayload(nfePayload, dadosEmitente);

      return resultado;
    } catch (error) {
      this.logger.error('Erro ao emitir NFe', error);
      return {
        error: `Erro ao emitir NFe: ${(error as Error).message}`,
      };
    }
  }
}
