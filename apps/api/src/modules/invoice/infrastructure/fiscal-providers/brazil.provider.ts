import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { Result, ValidationError } from '../../../../@core/domain/result';
import { IFiscalProvider, FiscalProviderResult } from '../../domain/services/fiscal-provider.interface';
import { PrismaService } from '../../../../prisma/prisma.service';

/**
 * Remove apenas formatação de CPF/CNPJ (. - / espaços).
 * Letras são PRESERVADAS — CNPJ alfanumérico (IN RFB nº 2229/2024).
 */
function stripFiscalId(value: string): string {
  return value.replace(/[.\-\/\s]/g, '').toUpperCase();
}

/** CEP é sempre numérico */
function stripCep(value: string): string {
  return value.replace(/\D/g, '');
}

interface FiscalConfig {
  focusNfeToken?: string;
  ambiente?: 'homologacao' | 'producao';
  razaoSocial?: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  codigoMunicipio?: string;
  regimeTributario?: number;
  logradouro?: string;
  numero?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
}

/**
 * Brazil NFe Provider
 * - SRP: Only handles Brazilian fiscal documents
 * - Integration with Focus NFe API (https://focusnfe.com.br)
 *
 * Requires tenant fiscal configuration (Configurações → Fiscal):
 *   - Focus NFe Token
 *   - CNPJ (já no cadastro)
 *   - Inscrição Estadual
 *   - Razão Social + endereço completo
 *
 * NF-e requer campos adicionais por item (NCM, CFOP, regimes tributários).
 * O cadastro completo é feito no painel da Focus NFe.
 */
@Injectable()
export class BrazilFiscalProvider implements IFiscalProvider {
  private readonly logger = new Logger(BrazilFiscalProvider.name);
  private readonly supportedCountryCodes = ['BR', 'BRA', 'BRAZIL'] as const;

  constructor(private readonly prisma: PrismaService) {}

  supportedCountries(): readonly string[] {
    return this.supportedCountryCodes;
  }

  supportsCountry(country: string): boolean {
    return this.supportedCountryCodes.includes(country.toUpperCase() as any);
  }

  validate(payload: Record<string, unknown>): Result<void, Error> {
    const errors: string[] = [];

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
    const validation = this.validate(payload);
    if (validation.isFailure) {
      return Result.ok({
        success: false,
        error: validation.error.message,
      } as FiscalProviderResult);
    }

    try {
      // Load tenant and fiscal config
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { taxId: true, fiscalConfig: true },
      });
      const fiscal = (tenant?.fiscalConfig ?? {}) as FiscalConfig;

      // Try real Focus NFe integration if configured
      if (
        fiscal.focusNfeToken &&
        tenant?.taxId &&
        fiscal.razaoSocial &&
        fiscal.inscricaoEstadual &&
        fiscal.logradouro &&
        fiscal.municipio &&
        fiscal.uf &&
        fiscal.cep
      ) {
        this.logger.log(`Emitindo NF-e via Focus NFe para tenant ${tenantId}`);
        const result = await this.callFocusNFeAPI(payload, tenant, fiscal);
        return Result.ok(result);
      }

      // Fallback: improved mock with real tenant data
      this.logger.warn(
        `NF-e em modo homologação local (sem token Focus NFe). Configure em Configurações → Fiscal.`,
      );
      const mockResult = await this.generateLocalMock(payload, tenant, fiscal);
      return Result.ok(mockResult);
    } catch (error) {
      return Result.ok({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      } as FiscalProviderResult);
    }
  }

  /**
   * Calls Focus NFe API to issue a real NF-e.
   * Requires full emitter configuration including NCM codes per item.
   */
  private async callFocusNFeAPI(
    payload: Record<string, unknown>,
    tenant: { taxId: string | null },
    fiscal: FiscalConfig,
  ): Promise<FiscalProviderResult> {
    const cnpj = tenant.taxId ? stripFiscalId(tenant.taxId) : '';
    const ambiente = fiscal.ambiente ?? 'homologacao';
    const hostname =
      ambiente === 'producao' ? 'api.focusnfe.com.br' : 'homologacao.focusnfe.com.br';

    const dest = payload.destinatario as Record<string, unknown>;
    const itens = payload.itens as Array<Record<string, unknown>>;
    const ref = `NF-${Date.now()}`;

    const nfePayload = {
      natureza_operacao: payload.naturezaOperacao,
      data_emissao: new Date().toISOString(),
      tipo_documento: 1,
      finalidade_emissao: 1,
      forma_pagamento: 0,

      // Emitente
      cnpj_emitente: cnpj,
      nome_emitente: fiscal.razaoSocial,
      nome_fantasia_emitente: fiscal.nomeFantasia || fiscal.razaoSocial,
      inscricao_estadual_emitente: fiscal.inscricaoEstadual,
      inscricao_municipal_emitente: fiscal.inscricaoMunicipal,
      regime_tributario_emitente: fiscal.regimeTributario ?? 1,
      logradouro_emitente: fiscal.logradouro,
      numero_emitente: fiscal.numero ?? 'S/N',
      bairro_emitente: fiscal.bairro ?? '',
      municipio_emitente: fiscal.municipio,
      uf_emitente: fiscal.uf,
      cep_emitente: fiscal.cep ? stripCep(fiscal.cep) : undefined,
      codigo_pais_emitente: '1058',

      // Destinatário
      ...(dest.cpfCnpj || dest.cnpj
        ? { cnpj_destinatario: stripFiscalId(String(dest.cpfCnpj ?? dest.cnpj)) }
        : {}),
      ...(dest.cpf ? { cpf_destinatario: stripFiscalId(String(dest.cpf)) } : {}),
      nome_destinatario: dest.nome,
      indicador_inscricao_estadual_destinatario: 9,
      ...(dest.email ? { email_destinatario: dest.email } : {}),

      // Itens (NF-e requer NCM e CFOP por item — usar defaults para Simples Nacional)
      itens: itens.map((item, index) => ({
        numero_item: index + 1,
        codigo_produto: item.codigoProduto ?? `ITEM${index + 1}`,
        descricao: item.descricao,
        codigo_ncm: (item.ncm as string) ?? '00000000',
        cfop: (item.cfop as string) ?? '5102',
        unidade_comercial: (item.unidade as string) ?? 'UN',
        quantidade_comercial: item.quantidade,
        valor_unitario_comercial: (item.valorUnitarioCents as number) / 100,
        valor_unitario_tributavel: (item.valorUnitarioCents as number) / 100,
        quantidade_tributavel: item.quantidade,
        unidade_tributavel: (item.unidade as string) ?? 'UN',
        valor_bruto:
          ((item.valorUnitarioCents as number) / 100) * (item.quantidade as number),
        icms_situacao_tributaria: '102',
        icms_origem: 0,
        pis_situacao_tributaria: '07',
        cofins_situacao_tributaria: '07',
      })),

      formas_pagamento: [
        {
          forma_pagamento: '99',
          valor_pagamento: itens.reduce(
            (sum, item) =>
              sum +
              ((item.valorUnitarioCents as number) / 100) * (item.quantidade as number),
            0,
          ),
        },
      ],
    };

    try {
      const response = await this.httpPost(hostname, `/v2/nfe?ref=${ref}`, fiscal.focusNfeToken!, nfePayload);

      if (response.statusCode === 200 || response.statusCode === 201) {
        const body = response.body;
        if (body.status === 'autorizado') {
          return {
            success: true,
            data: Object.freeze({
              chaveNfe: body.chave_nfe,
              numeroNfe: body.numero,
              serieNfe: body.serie,
              dataEmissao: body.data_emissao,
              urlDanfe: body.link_danfe,
              xmlBase64: body.xml_nfe_base64,
              protocolo: body.protocolo,
              ambiente,
            }),
          } as FiscalProviderResult;
        }

        const errorMsg =
          body.mensagem_sefaz ||
          body.erros?.[0]?.mensagem ||
          'NF-e em processamento';
        return { success: false, error: `Focus NFe: ${errorMsg}` } as FiscalProviderResult;
      }

      const errorMsg =
        response.body?.erros?.[0]?.mensagem ||
        response.body?.mensagem ||
        `HTTP ${response.statusCode}`;
      return { success: false, error: `Focus NFe: ${errorMsg}` } as FiscalProviderResult;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro de conexão';
      this.logger.error(`Erro Focus NFe NF-e: ${msg}`);
      return { success: false, error: msg } as FiscalProviderResult;
    }
  }

  /**
   * Local mock with real tenant data.
   * Used when Focus NFe is not configured.
   * Generates a realistic-looking NF-e number for testing.
   */
  private async generateLocalMock(
    payload: Record<string, unknown>,
    tenant: { taxId: string | null } | null,
    fiscal: FiscalConfig,
  ): Promise<FiscalProviderResult> {
    await new Promise((resolve) => setTimeout(resolve, 100));

    const cnpj = tenant?.taxId ? stripFiscalId(tenant.taxId) : '00000000000000';
    const now = new Date();
    const uf = fiscal.uf ?? '35'; // SP default
    const anoMes = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const seq = Math.floor(Math.random() * 1000000).toString().padStart(9, '0');
    const serie = '001';
    const numero = Math.floor(Math.random() * 100000);

    // Chave NF-e (44 dígitos): cUF + AAMM + CNPJ + mod + serie + nNF + tpEmis + cNF + cDV
    const chaveNfe = `${uf}${anoMes}${cnpj}55${serie}${String(numero).padStart(9, '0')}1${seq.substring(0, 9)}0`;

    return {
      success: true,
      data: Object.freeze({
        chaveNfe: chaveNfe.substring(0, 44),
        numeroNfe: numero,
        serieNfe: '001',
        dataEmissao: now.toISOString(),
        emitente: fiscal.razaoSocial || 'Empresa',
        cnpjEmitente: tenant?.taxId || '—',
        urlDanfe: null, // Sem DANFE em modo local
        xmlBase64: null,
        protocolo: `135${Date.now()}`,
        ambiente: 'homologacao_local',
        aviso:
          'NF-e gerada localmente (não submetida ao SEFAZ). Configure token Focus NFe em Configurações → Fiscal para emissão real.',
      }),
    } as FiscalProviderResult;
  }

  private httpPost(
    hostname: string,
    path: string,
    token: string,
    body: object,
  ): Promise<{ statusCode: number; body: any }> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${token}:`).toString('base64');
      const bodyStr = JSON.stringify(body);

      const options: https.RequestOptions = {
        hostname,
        path,
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
        },
        timeout: 30000,
      };

      const req = https.request(options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            resolve({ statusCode: res.statusCode ?? 0, body: JSON.parse(data) });
          } catch {
            resolve({ statusCode: res.statusCode ?? 0, body: data });
          }
        });
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout ao conectar com Focus NFe'));
      });

      req.write(bodyStr);
      req.end();
    });
  }
}
