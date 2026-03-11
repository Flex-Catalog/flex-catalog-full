import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';

/**
 * Remove apenas caracteres de formatação de CPF/CNPJ (. - / espaço).
 * Letras são PRESERVADAS porque o CNPJ alfanumérico (IN RFB nº 2229/2024)
 * permite A-Z nas primeiras 8 posições a partir de julho/2026.
 */
function stripFiscalId(value: string): string {
  return value.replace(/[.\-\/\s]/g, '').toUpperCase();
}

/** CEP é sempre numérico — pode continuar usando replace(/\D/g, '') */
function stripCep(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Focus NFe API Client
 * Documentação: https://focusnfe.com.br/doc/
 *
 * Homologação: https://homologacao.focusnfe.com.br/v2/
 * Produção:    https://api.focusnfe.com.br/v2/
 *
 * Autenticação: HTTP Basic Auth com token como usuário e senha em branco.
 */

export interface FiscalConfig {
  ambiente?: 'homologacao' | 'producao';
  razaoSocial?: string;
  nomeFantasia?: string;
  inscricaoEstadual?: string;
  inscricaoMunicipal?: string;
  codigoMunicipio?: string;   // Código IBGE do município (7 dígitos, ex: 3550308 = São Paulo)
  regimeTributario?: number;  // 1=Simples Nacional, 2=ME/EPP, 3=Regime Normal
  itemListaServico?: string;  // Código LC116 (ex: "16.01" = Transporte)
  aliquotaISS?: number;       // Alíquota ISS em % (ex: 5.0)
  cnaeCode?: string;          // Código CNAE
  codigoTributacaoMunicipal?: string;
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  municipio?: string;
  uf?: string;
  cep?: string;
  telefone?: string;
  email?: string;
  simplesNacional?: boolean;
}

export interface FocusNfseResult {
  numero?: string;
  codigoVerificacao?: string;
  pdfUrl?: string;
  xmlBase64?: string;
  status?: string;
  ref?: string;
}

@Injectable()
export class FocusNfeService {
  private readonly logger = new Logger(FocusNfeService.name);

  private getHostname(ambiente: 'homologacao' | 'producao'): string {
    return ambiente === 'producao'
      ? 'api.focusnfe.com.br'
      : 'homologacao.focusnfe.com.br';
  }

  private httpRequest(
    hostname: string,
    path: string,
    method: string,
    token: string,
    body?: object,
  ): Promise<{ statusCode: number; body: any }> {
    return new Promise((resolve, reject) => {
      const auth = Buffer.from(`${token}:`).toString('base64');
      const bodyStr = body ? JSON.stringify(body) : '';

      const options: https.RequestOptions = {
        hostname,
        path,
        method,
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

      if (bodyStr) req.write(bodyStr);
      req.end();
    });
  }

  /**
   * Emite uma NFS-e via Focus NFe API.
   * Retorna { success, data } com os dados da nota ou um erro.
   *
   * O `ref` é um identificador único usado pela Focus NFe para idempotência.
   * Usar o orderNumber como ref garante que o mesmo documento não seja emitido duas vezes.
   */
  async emitirNfse(params: {
    token: string;
    ambiente: 'homologacao' | 'producao';
    ref: string;
    dataEmissao: string; // YYYY-MM-DD
    prestador: {
      cnpj: string;            // somente dígitos
      inscricaoMunicipal: string;
      codigoMunicipio: string;
    };
    tomador: {
      cnpj?: string;           // somente dígitos
      cpf?: string;
      razaoSocial: string;
      email?: string;
    };
    servico: {
      valorServicos: number;   // em reais (ex: 1500.00)
      issrfRetido?: boolean;
      itemListaServico: string; // ex: "16.01"
      discriminacao: string;
      codigoMunicipio: string;
      aliquota?: number;       // ex: 5.0 para 5%
      codigoTributacaoMunicipal?: string;
    };
  }): Promise<{ success: boolean; data?: FocusNfseResult; error?: string }> {
    const hostname = this.getHostname(params.ambiente);

    const payload = {
      data_emissao: params.dataEmissao,
      prestador: {
        cnpj: stripFiscalId(params.prestador.cnpj),
        inscricao_municipal: params.prestador.inscricaoMunicipal,
        codigo_municipio: params.prestador.codigoMunicipio,
      },
      tomador: {
        ...(params.tomador.cnpj
          ? { cnpj: stripFiscalId(params.tomador.cnpj) }
          : {}),
        ...(params.tomador.cpf
          ? { cpf: stripFiscalId(params.tomador.cpf) }
          : {}),
        razao_social: params.tomador.razaoSocial,
        ...(params.tomador.email ? { email: params.tomador.email } : {}),
      },
      servico: {
        valor_servicos: params.servico.valorServicos,
        issrf_retido: params.servico.issrfRetido ?? false,
        item_lista_servico: params.servico.itemListaServico,
        discriminacao: params.servico.discriminacao,
        codigo_municipio: params.servico.codigoMunicipio,
        ...(params.servico.aliquota !== undefined
          ? { aliquota: params.servico.aliquota }
          : {}),
        ...(params.servico.codigoTributacaoMunicipal
          ? { codigo_tributacao_municipio: params.servico.codigoTributacaoMunicipal }
          : {}),
      },
    };

    try {
      this.logger.log(`Emitindo NFS-e via Focus NFe | ref=${params.ref} | ambiente=${params.ambiente}`);

      const response = await this.httpRequest(
        hostname,
        `/v2/nfse?ref=${encodeURIComponent(params.ref)}`,
        'POST',
        params.token,
        payload,
      );

      this.logger.debug(`Focus NFe NFS-e response: status=${response.statusCode}`);

      // Focus NFe retorna 200/201 quando aceito
      if (response.statusCode === 200 || response.statusCode === 201) {
        return this.parseNfseResponse(response.body, params.ref);
      }

      // 422 = já existe documento com este ref
      if (response.statusCode === 422) {
        return this.consultarNfse(hostname, params.token, params.ref);
      }

      const errorMsg =
        response.body?.erros?.[0]?.mensagem ||
        response.body?.mensagem ||
        `Erro HTTP ${response.statusCode}`;

      return { success: false, error: `Focus NFe: ${errorMsg}` };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Erro ao emitir NFS-e: ${msg}`);
      return { success: false, error: msg };
    }
  }

  private async consultarNfse(
    hostname: string,
    token: string,
    ref: string,
  ): Promise<{ success: boolean; data?: FocusNfseResult; error?: string }> {
    try {
      const response = await this.httpRequest(
        hostname,
        `/v2/nfse/${encodeURIComponent(ref)}`,
        'GET',
        token,
      );

      if (response.statusCode === 200) {
        return this.parseNfseResponse(response.body, ref);
      }

      return { success: false, error: 'NFS-e não encontrada' };
    } catch (error) {
      return { success: false, error: 'Erro ao consultar NFS-e' };
    }
  }

  private parseNfseResponse(
    body: any,
    ref: string,
  ): { success: boolean; data?: FocusNfseResult; error?: string } {
    const status = body?.status;

    if (status === 'autorizado') {
      return {
        success: true,
        data: {
          numero: body.numero_nfse ?? body.numero,
          codigoVerificacao: body.codigo_verificacao,
          pdfUrl: body.link_nfse_pdf,
          xmlBase64: body.xml_nfse_base64,
          status: 'autorizado',
          ref,
        },
      };
    }

    if (status === 'processando_autorizacao') {
      return {
        success: false,
        error: 'NFS-e em processamento. Aguarde alguns instantes e tente novamente.',
      };
    }

    if (status === 'erro_autorizacao' || body?.erros?.length > 0) {
      const errorMsg =
        body?.mensagem_sefaz ||
        body?.erros?.[0]?.mensagem ||
        'Erro de autorização SEFAZ';
      return { success: false, error: `SEFAZ: ${errorMsg}` };
    }

    // Resposta não esperada
    return {
      success: false,
      error: `Status inesperado: ${status ?? JSON.stringify(body)}`,
    };
  }

  /**
   * Garante que a empresa (CNPJ) está cadastrada no Focus NFe antes de emitir documentos.
   * Focus NFe retorna HTTP 401 se o CNPJ não estiver cadastrado na conta.
   *
   * Tenta GET primeiro; se 404, faz POST para criar; se já existe, faz PUT para atualizar.
   */
  async ensureEmpresaRegistrada(params: {
    token: string;
    ambiente: 'homologacao' | 'producao';
    cnpj: string;           // somente dígitos
    razaoSocial: string;
    fiscal: FiscalConfig;
  }): Promise<{ success: boolean; error?: string }> {
    const hostname = this.getHostname(params.ambiente);
    const cnpj = stripFiscalId(params.cnpj);

    const empresaBody: Record<string, unknown> = {
      nome: params.razaoSocial,
      ...(params.fiscal.nomeFantasia ? { nome_fantasia: params.fiscal.nomeFantasia } : {}),
      ...(params.fiscal.email ? { email: params.fiscal.email } : {}),
      ...(params.fiscal.telefone ? { telefone: params.fiscal.telefone } : {}),
      inscricao_municipal: params.fiscal.inscricaoMunicipal ?? '',
      codigo_municipio: params.fiscal.codigoMunicipio ?? '',
      regime_tributario: params.fiscal.regimeTributario ?? 1,
      ...(params.fiscal.logradouro ? { logradouro: params.fiscal.logradouro } : {}),
      ...(params.fiscal.numero ? { numero: params.fiscal.numero } : {}),
      ...(params.fiscal.complemento ? { complemento: params.fiscal.complemento } : {}),
      ...(params.fiscal.bairro ? { bairro: params.fiscal.bairro } : {}),
      ...(params.fiscal.municipio ? { municipio: params.fiscal.municipio } : {}),
      ...(params.fiscal.uf ? { uf: params.fiscal.uf } : {}),
      ...(params.fiscal.cep ? { cep: stripCep(params.fiscal.cep) } : {}),
    };

    try {
      // 1. Check if empresa already exists
      const getRes = await this.httpRequest(hostname, `/v2/empresas/${cnpj}`, 'GET', params.token);

      if (getRes.statusCode === 200) {
        // Already registered – update to keep data fresh
        const putRes = await this.httpRequest(
          hostname,
          `/v2/empresas/${cnpj}`,
          'PUT',
          params.token,
          empresaBody,
        );
        if (putRes.statusCode === 200 || putRes.statusCode === 201) {
          this.logger.log(`Empresa ${cnpj} atualizada no Focus NFe`);
          return { success: true };
        }
        const errMsg = putRes.body?.mensagem || `Erro HTTP ${putRes.statusCode} ao atualizar empresa`;
        this.logger.warn(`Focus NFe PUT empresa: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      if (getRes.statusCode === 404) {
        // Not registered – create now
        const postBody = { cnpj, ...empresaBody };
        const postRes = await this.httpRequest(
          hostname,
          `/v2/empresas`,
          'POST',
          params.token,
          postBody,
        );
        if (postRes.statusCode === 200 || postRes.statusCode === 201) {
          this.logger.log(`Empresa ${cnpj} cadastrada no Focus NFe`);
          return { success: true };
        }
        const errMsg =
          postRes.body?.erros?.[0]?.mensagem ||
          postRes.body?.mensagem ||
          `Erro HTTP ${postRes.statusCode} ao cadastrar empresa`;
        this.logger.warn(`Focus NFe POST empresa: ${errMsg}`);
        return { success: false, error: errMsg };
      }

      // Unexpected status
      const msg = `Erro HTTP ${getRes.statusCode} ao verificar empresa no Focus NFe`;
      this.logger.warn(msg);
      return { success: false, error: msg };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro ao registrar empresa no Focus NFe';
      this.logger.error(msg);
      return { success: false, error: msg };
    }
  }

  /**
   * Emite uma NF-e (Nota Fiscal Eletrônica de produto) via Focus NFe.
   * Requer NCM, CFOP e informações tributárias por item.
   * Esta implementação cobre o caso simplificado (Simples Nacional).
   */
  async emitirNfe(params: {
    token: string;
    ambiente: 'homologacao' | 'producao';
    ref: string;
    emitente: {
      cnpj: string;
      razaoSocial: string;
      nomeFantasia?: string;
      inscricaoEstadual?: string;
      inscricaoMunicipal?: string;
      regimeTributario?: number; // 1=SN
      logradouro: string;
      numero: string;
      bairro: string;
      municipio: string;
      uf: string;
      cep: string;
      codigoPais?: string; // 1058 = Brasil
    };
    destinatario: {
      cnpj?: string;
      cpf?: string;
      nome: string;
      email?: string;
      indicadorIe?: number; // 9 = Não contribuinte
    };
    naturezaOperacao: string;
    itens: Array<{
      codigoProduto?: string;
      descricao: string;
      ncm?: string;           // Código NCM 8 dígitos (obrigatório SEFAZ)
      cfop?: string;          // Código CFOP (ex: '5102')
      unidade?: string;       // 'UN', 'KG', etc.
      quantidade: number;
      valorUnitario: number;
      valorBruto?: number;
    }>;
    formaPagamento?: number; // 01=Dinheiro, 15=Boleto, 99=Sem pagamento
    valorTotal: number;
  }): Promise<{ success: boolean; data?: Record<string, unknown>; error?: string }> {
    const hostname = this.getHostname(params.ambiente);

    const payload = {
      natureza_operacao: params.naturezaOperacao,
      data_emissao: new Date().toISOString(),
      tipo_documento: 1, // 1=NF-e
      finalidade_emissao: 1, // 1=Normal
      forma_pagamento: 0, // 0=À vista

      // Emitente
      cnpj_emitente: stripFiscalId(params.emitente.cnpj),
      nome_emitente: params.emitente.razaoSocial,
      nome_fantasia_emitente: params.emitente.nomeFantasia,
      inscricao_estadual_emitente: params.emitente.inscricaoEstadual,
      inscricao_municipal_emitente: params.emitente.inscricaoMunicipal,
      regime_tributario_emitente: params.emitente.regimeTributario ?? 1,
      logradouro_emitente: params.emitente.logradouro,
      numero_emitente: params.emitente.numero,
      bairro_emitente: params.emitente.bairro,
      municipio_emitente: params.emitente.municipio,
      uf_emitente: params.emitente.uf,
      cep_emitente: stripCep(params.emitente.cep),
      codigo_pais_emitente: params.emitente.codigoPais ?? '1058',

      // Destinatário
      ...(params.destinatario.cnpj
        ? { cnpj_destinatario: stripFiscalId(params.destinatario.cnpj) }
        : {}),
      ...(params.destinatario.cpf
        ? { cpf_destinatario: stripFiscalId(params.destinatario.cpf) }
        : {}),
      nome_destinatario: params.destinatario.nome,
      indicador_inscricao_estadual_destinatario: params.destinatario.indicadorIe ?? 9,
      ...(params.destinatario.email
        ? { email_destinatario: params.destinatario.email }
        : {}),

      // Itens
      itens: params.itens.map((item, index) => ({
        numero_item: index + 1,
        codigo_produto: item.codigoProduto ?? `ITEM${index + 1}`,
        descricao: item.descricao,
        codigo_ncm: item.ncm ?? '00000000',
        cfop: item.cfop ?? '5102',
        unidade_comercial: item.unidade ?? 'UN',
        quantidade_comercial: item.quantidade,
        valor_unitario_comercial: item.valorUnitario,
        valor_unitario_tributavel: item.valorUnitario,
        quantidade_tributavel: item.quantidade,
        unidade_tributavel: item.unidade ?? 'UN',
        valor_bruto: item.valorBruto ?? item.valorUnitario * item.quantidade,
        // Simples Nacional - sem tributação de ICMS/PIS/COFINS
        icms_situacao_tributaria: '102',
        icms_origem: 0,
        pis_situacao_tributaria: '07',
        cofins_situacao_tributaria: '07',
      })),

      formas_pagamento: [
        {
          forma_pagamento: params.formaPagamento ?? '99',
          valor_pagamento: params.valorTotal,
        },
      ],
    };

    try {
      this.logger.log(`Emitindo NF-e via Focus NFe | ref=${params.ref}`);

      const response = await this.httpRequest(
        hostname,
        `/v2/nfe?ref=${encodeURIComponent(params.ref)}`,
        'POST',
        params.token,
        payload,
      );

      if (response.statusCode === 200 || response.statusCode === 201) {
        const body = response.body;
        if (body.status === 'autorizado') {
          return {
            success: true,
            data: {
              chaveNfe: body.chave_nfe,
              numeroNfe: body.numero,
              serieNfe: body.serie,
              dataEmissao: body.data_emissao,
              urlDanfe: body.link_danfe,
              xmlBase64: body.xml_nfe_base64,
              protocolo: body.protocolo,
            },
          };
        }
        return {
          success: false,
          error: body.mensagem_sefaz || 'NF-e em processamento',
        };
      }

      return {
        success: false,
        error:
          response.body?.erros?.[0]?.mensagem ||
          response.body?.mensagem ||
          `Erro HTTP ${response.statusCode}`,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Erro desconhecido';
      this.logger.error(`Erro ao emitir NF-e: ${msg}`);
      return { success: false, error: msg };
    }
  }
}
