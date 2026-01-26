import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NFeData, NFeRetornoSefaz, NFeStatus } from '../types/nfe.types';

/**
 * Integração com Focus NFe (gateway fiscal)
 * Documentação: https://focusnfe.com.br/doc/
 */
@Injectable()
export class FocusNFeService {
  private readonly logger = new Logger(FocusNFeService.name);
  private readonly baseUrl: string;
  private readonly token: string;
  private readonly ambiente: 'homologacao' | 'producao';

  constructor(private readonly configService: ConfigService) {
    this.token = this.configService.get<string>('FOCUS_NFE_TOKEN') || '';
    this.ambiente = this.configService.get<string>('FOCUS_NFE_AMBIENTE') as any || 'homologacao';
    this.baseUrl = this.ambiente === 'producao'
      ? 'https://api.focusnfe.com.br'
      : 'https://homologacao.focusnfe.com.br';
  }

  private getAuthHeader(): string {
    return `Basic ${Buffer.from(`${this.token}:`).toString('base64')}`;
  }

  async emitirNFe(nfe: NFeData, referencia: string): Promise<NFeRetornoSefaz> {
    if (!this.token) {
      return {
        cStat: '999',
        xMotivo: 'Focus NFe não configurado. Configure FOCUS_NFE_TOKEN no .env',
      };
    }

    try {
      const payload = this.converterParaFormatoFocus(nfe);

      const response = await fetch(`${this.baseUrl}/v2/nfe?ref=${referencia}`, {
        method: 'POST',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.status === 'autorizado') {
        return {
          cStat: '100',
          xMotivo: 'Autorizado o uso da NF-e',
          chNFe: data.chave_nfe,
          nProt: data.numero_protocolo,
          dhRecbto: data.data_recebimento,
        };
      }

      return {
        cStat: data.codigo || '999',
        xMotivo: data.mensagem || 'Erro ao emitir NFe',
      };
    } catch (error) {
      this.logger.error('Erro ao emitir NFe via Focus', error);
      return {
        cStat: '999',
        xMotivo: `Erro de comunicação: ${(error as Error).message}`,
      };
    }
  }

  async consultarNFe(referencia: string): Promise<NFeRetornoSefaz> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/nfe/${referencia}`, {
        method: 'GET',
        headers: { 'Authorization': this.getAuthHeader() },
      });

      const data = await response.json();
      return {
        cStat: data.status === 'autorizado' ? '100' : data.codigo,
        xMotivo: data.mensagem || data.status,
        chNFe: data.chave_nfe,
        nProt: data.numero_protocolo,
      };
    } catch (error) {
      return {
        cStat: '999',
        xMotivo: `Erro ao consultar: ${(error as Error).message}`,
      };
    }
  }

  async cancelarNFe(referencia: string, justificativa: string): Promise<NFeRetornoSefaz> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/nfe/${referencia}`, {
        method: 'DELETE',
        headers: {
          'Authorization': this.getAuthHeader(),
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ justificativa }),
      });

      const data = await response.json();
      return {
        cStat: data.status === 'cancelado' ? '135' : data.codigo,
        xMotivo: data.mensagem || 'NFe cancelada',
      };
    } catch (error) {
      return {
        cStat: '999',
        xMotivo: `Erro ao cancelar: ${(error as Error).message}`,
      };
    }
  }

  async obterDanfe(referencia: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/nfe/${referencia}.pdf`, {
        method: 'GET',
        headers: { 'Authorization': this.getAuthHeader() },
      });

      if (!response.ok) return null;

      const buffer = await response.arrayBuffer();
      return Buffer.from(buffer).toString('base64');
    } catch {
      return null;
    }
  }

  async obterXml(referencia: string): Promise<string | null> {
    try {
      const response = await fetch(`${this.baseUrl}/v2/nfe/${referencia}.xml`, {
        method: 'GET',
        headers: { 'Authorization': this.getAuthHeader() },
      });

      if (!response.ok) return null;
      return await response.text();
    } catch {
      return null;
    }
  }

  private converterParaFormatoFocus(nfe: NFeData): any {
    return {
      natureza_operacao: nfe.ide.natOp,
      data_emissao: new Date().toISOString(),
      tipo_documento: nfe.ide.tpNF === '1' ? 1 : 0,
      finalidade_emissao: parseInt(nfe.ide.finNFe),
      consumidor_final: nfe.ide.indFinal === '1' ? 1 : 0,
      presenca_comprador: parseInt(nfe.ide.indPres),

      cnpj_emitente: nfe.emit.CNPJ,
      nome_emitente: nfe.emit.xNome,
      nome_fantasia_emitente: nfe.emit.xFant,
      logradouro_emitente: nfe.emit.enderEmit.xLgr,
      numero_emitente: nfe.emit.enderEmit.nro,
      bairro_emitente: nfe.emit.enderEmit.xBairro,
      municipio_emitente: nfe.emit.enderEmit.xMun,
      uf_emitente: nfe.emit.enderEmit.UF,
      cep_emitente: nfe.emit.enderEmit.CEP,
      inscricao_estadual_emitente: nfe.emit.IE,
      regime_tributario_emitente: parseInt(nfe.emit.CRT),

      ...(nfe.dest && {
        cnpj_destinatario: nfe.dest.CNPJ,
        cpf_destinatario: nfe.dest.CPF,
        nome_destinatario: nfe.dest.xNome,
        logradouro_destinatario: nfe.dest.enderDest?.xLgr,
        numero_destinatario: nfe.dest.enderDest?.nro,
        bairro_destinatario: nfe.dest.enderDest?.xBairro,
        municipio_destinatario: nfe.dest.enderDest?.xMun,
        uf_destinatario: nfe.dest.enderDest?.UF,
        cep_destinatario: nfe.dest.enderDest?.CEP,
        indicador_inscricao_estadual_destinatario: parseInt(nfe.dest.indIEDest),
        email_destinatario: nfe.dest.email,
      }),

      items: nfe.det.map((item, index) => ({
        numero_item: index + 1,
        codigo_produto: item.prod.cProd,
        descricao: item.prod.xProd,
        codigo_ncm: item.prod.NCM,
        cfop: item.prod.CFOP,
        unidade_comercial: item.prod.uCom,
        quantidade_comercial: parseFloat(item.prod.qCom),
        valor_unitario_comercial: parseFloat(item.prod.vUnCom),
        valor_bruto: parseFloat(item.prod.vProd),
        unidade_tributavel: item.prod.uTrib,
        quantidade_tributavel: parseFloat(item.prod.qTrib),
        valor_unitario_tributavel: parseFloat(item.prod.vUnTrib),
        inclui_no_total: item.prod.indTot === '1' ? 1 : 0,
        icms_origem: parseInt(item.imposto.ICMS.orig),
        icms_situacao_tributaria: item.imposto.ICMS.CST || item.imposto.ICMS.CSOSN,
        icms_base_calculo: parseFloat(item.imposto.ICMS.vBC || '0'),
        icms_aliquota: parseFloat(item.imposto.ICMS.pICMS || '0'),
        icms_valor: parseFloat(item.imposto.ICMS.vICMS || '0'),
        pis_situacao_tributaria: item.imposto.PIS.CST,
        pis_base_calculo: parseFloat(item.imposto.PIS.vBC || '0'),
        pis_aliquota: parseFloat(item.imposto.PIS.pPIS || '0'),
        pis_valor: parseFloat(item.imposto.PIS.vPIS || '0'),
        cofins_situacao_tributaria: item.imposto.COFINS.CST,
        cofins_base_calculo: parseFloat(item.imposto.COFINS.vBC || '0'),
        cofins_aliquota: parseFloat(item.imposto.COFINS.pCOFINS || '0'),
        cofins_valor: parseFloat(item.imposto.COFINS.vCOFINS || '0'),
      })),

      modalidade_frete: parseInt(nfe.transp.modFrete),

      formas_pagamento: nfe.pag.detPag.map(p => ({
        forma_pagamento: p.tPag,
        valor_pagamento: parseFloat(p.vPag),
      })),

      informacoes_adicionais_contribuinte: nfe.infAdic?.infCpl,
    };
  }
}
