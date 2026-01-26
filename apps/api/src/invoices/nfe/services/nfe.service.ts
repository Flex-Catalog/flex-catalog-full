import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NFeXmlGenerator } from '../xml/nfe-xml-generator';
import { FocusNFeService } from './focus-nfe.service';
import { NFeData, NFeRetornoSefaz, CODIGOS_UF } from '../types/nfe.types';
import { InvoicePayload, InvoiceResult } from '@product-catalog/shared';

export interface DadosEmitente {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia?: string;
  inscricaoEstadual: string;
  inscricaoMunicipal?: string;
  crt: '1' | '2' | '3'; // Regime tributário
  endereco: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    codigoMunicipio: string;
    nomeMunicipio: string;
    uf: string;
    cep: string;
    telefone?: string;
  };
}

export interface DadosDestinatario {
  cpfCnpj: string;
  nome: string;
  email?: string;
  indicadorIE: '1' | '2' | '9';
  inscricaoEstadual?: string;
  endereco?: {
    logradouro: string;
    numero: string;
    complemento?: string;
    bairro: string;
    codigoMunicipio: string;
    nomeMunicipio: string;
    uf: string;
    cep: string;
    telefone?: string;
  };
}

export interface ItemNFe {
  codigo: string;
  descricao: string;
  ncm: string;
  cfop: string;
  unidade: string;
  quantidade: number;
  valorUnitario: number;
  valorTotal: number;
  // Tributos
  icmsOrigem?: string;
  icmsCST?: string;
  icmsCSOSN?: string;
  icmsBaseCalculo?: number;
  icmsAliquota?: number;
  icmsValor?: number;
  pisCST?: string;
  pisBaseCalculo?: number;
  pisAliquota?: number;
  pisValor?: number;
  cofinsCST?: string;
  cofinsBaseCalculo?: number;
  cofinsAliquota?: number;
  cofinsValor?: number;
}

export interface EmissaoNFeInput {
  emitente: DadosEmitente;
  destinatario: DadosDestinatario;
  itens: ItemNFe[];
  naturezaOperacao: string;
  serie?: string;
  numero?: number;
  formaPagamento: string;
  valorPagamento: number;
  informacoesAdicionais?: string;
}

@Injectable()
export class NFeService {
  private readonly logger = new Logger(NFeService.name);
  private readonly xmlGenerator: NFeXmlGenerator;
  private sequencialNFe = 1;

  constructor(
    private readonly configService: ConfigService,
    private readonly focusNFeService: FocusNFeService,
  ) {
    this.xmlGenerator = new NFeXmlGenerator();
  }

  /**
   * Emite uma NFe a partir dos dados simplificados
   */
  async emitir(input: EmissaoNFeInput): Promise<InvoiceResult> {
    try {
      // Monta estrutura completa da NFe
      const nfeData = this.montarNFeData(input);

      // Valida NFe
      const validacao = this.xmlGenerator.validarNFe(nfeData);
      if (!validacao.valido) {
        return {
          error: `Validação falhou: ${validacao.erros.join(', ')}`,
        };
      }

      // Gera chave de acesso
      const agora = new Date();
      const chaveAcesso = this.xmlGenerator.gerarChaveAcesso({
        cUF: CODIGOS_UF[input.emitente.endereco.uf] || '35',
        AAMM: `${agora.getFullYear().toString().slice(2)}${(agora.getMonth() + 1).toString().padStart(2, '0')}`,
        CNPJ: input.emitente.cnpj.replace(/\D/g, ''),
        mod: '55',
        serie: input.serie || '1',
        nNF: (input.numero || this.sequencialNFe++).toString(),
        tpEmis: '1',
        cNF: this.xmlGenerator.gerarCodigoNumerico(),
      });

      // Gera XML
      const xml = this.xmlGenerator.gerarXml(nfeData, chaveAcesso);

      // Verifica se deve usar gateway ou modo simulação
      const usarGateway = this.configService.get<string>('FOCUS_NFE_TOKEN');

      if (usarGateway) {
        // Emite via Focus NFe
        const resultado = await this.focusNFeService.emitirNFe(
          nfeData,
          `nfe-${Date.now()}`,
        );

        if (resultado.cStat === '100') {
          const danfe = await this.focusNFeService.obterDanfe(`nfe-${Date.now()}`);
          return {
            success: true,
            invoiceNumber: resultado.chNFe,
            protocol: resultado.nProt,
            issuedAt: resultado.dhRecbto,
            xml,
            danfePdf: danfe || undefined,
          };
        }

        return {
          error: `${resultado.cStat} - ${resultado.xMotivo}`,
        };
      }

      // Modo simulação (homologação sem gateway)
      this.logger.warn('NFe em modo simulação - configure FOCUS_NFE_TOKEN para produção');

      return {
        success: true,
        invoiceNumber: chaveAcesso,
        protocol: `SIM${Date.now()}`,
        issuedAt: new Date().toISOString(),
        xml,
        message: 'NFe gerada em modo simulação. Configure um gateway fiscal para emissão real.',
      };
    } catch (error) {
      this.logger.error('Erro ao emitir NFe', error);
      return {
        error: `Erro interno: ${(error as Error).message}`,
      };
    }
  }

  /**
   * Converte InvoicePayload do sistema para formato de emissão
   */
  async emitirDePayload(
    payload: InvoicePayload,
    dadosEmitente: DadosEmitente,
  ): Promise<InvoiceResult> {
    // Obtém dados do cliente (retrocompatibilidade com formato antigo)
    const customer = payload.customer || {
      name: payload.recipientName || '',
      taxId: payload.recipientTaxId || '',
    };

    if (!customer.taxId || !customer.name) {
      return {
        error: 'Dados do destinatário incompletos. Informe nome e CPF/CNPJ.',
      };
    }

    const input: EmissaoNFeInput = {
      emitente: dadosEmitente,
      destinatario: {
        cpfCnpj: customer.taxId,
        nome: customer.name,
        email: customer.email,
        indicadorIE: customer.ieIndicator || '9', // Não contribuinte por padrão
        inscricaoEstadual: customer.stateRegistration,
        endereco: customer.address ? {
          logradouro: customer.address.street,
          numero: customer.address.number,
          complemento: customer.address.complement,
          bairro: customer.address.neighborhood,
          codigoMunicipio: customer.address.cityCode || '3550308',
          nomeMunicipio: customer.address.city,
          uf: customer.address.state,
          cep: customer.address.zipCode,
          telefone: customer.address.phone,
        } : undefined,
      },
      itens: payload.items.map((item, index) => ({
        codigo: item.productId || `ITEM${index + 1}`,
        descricao: item.description,
        ncm: item.ncm || '00000000',
        cfop: item.cfop || '5102', // Venda de mercadoria
        unidade: item.unit || 'UN',
        quantidade: item.quantity,
        valorUnitario: item.unitPriceCents / 100,
        valorTotal: item.totalCents ? item.totalCents / 100 : (item.quantity * item.unitPriceCents) / 100,
        // Tributos - usa valores do item ou padrão (Simples Nacional)
        icmsOrigem: item.icmsOrigin || '0',
        icmsCST: item.icmsCST,
        icmsCSOSN: item.icmsCSOSN || '102',
        pisCST: item.pisCST || '99',
        cofinsCST: item.cofinsCST || '99',
      })),
      naturezaOperacao: payload.operationType || 'VENDA DE MERCADORIA',
      serie: payload.series,
      numero: payload.number,
      formaPagamento: this.mapearFormaPagamento(payload.paymentMethod),
      valorPagamento: payload.items.reduce(
        (acc, item) => acc + (item.totalCents ? item.totalCents / 100 : (item.quantity * item.unitPriceCents) / 100),
        0,
      ),
      informacoesAdicionais: payload.notes,
    };

    return this.emitir(input);
  }

  private montarNFeData(input: EmissaoNFeInput): NFeData {
    const agora = new Date();
    const codigoNumerico = this.xmlGenerator.gerarCodigoNumerico();
    const serie = input.serie || '1';
    const numero = (input.numero || this.sequencialNFe).toString();

    // Calcula totais
    const valorProdutos = input.itens.reduce((acc, item) => acc + item.valorTotal, 0);
    const valorICMS = input.itens.reduce((acc, item) => acc + (item.icmsValor || 0), 0);
    const valorPIS = input.itens.reduce((acc, item) => acc + (item.pisValor || 0), 0);
    const valorCOFINS = input.itens.reduce((acc, item) => acc + (item.cofinsValor || 0), 0);

    return {
      ide: {
        cUF: CODIGOS_UF[input.emitente.endereco.uf] || '35',
        cNF: codigoNumerico,
        natOp: input.naturezaOperacao,
        mod: '55',
        serie,
        nNF: numero,
        dhEmi: agora.toISOString(),
        tpNF: '1', // Saída
        idDest: '1', // Operação interna
        cMunFG: input.emitente.endereco.codigoMunicipio,
        tpImp: '1', // DANFE normal
        tpEmis: '1', // Emissão normal
        cDV: '0', // Será calculado
        tpAmb: this.configService.get<string>('NFE_AMBIENTE') === 'producao' ? '1' : '2',
        finNFe: '1', // NFe normal
        indFinal: '1', // Consumidor final
        indPres: '1', // Presencial
        procEmi: '0', // Aplicativo do contribuinte
        verProc: 'FlexCatalog 1.0',
      },
      emit: {
        CNPJ: input.emitente.cnpj.replace(/\D/g, ''),
        xNome: input.emitente.razaoSocial,
        xFant: input.emitente.nomeFantasia,
        enderEmit: {
          xLgr: input.emitente.endereco.logradouro,
          nro: input.emitente.endereco.numero,
          xCpl: input.emitente.endereco.complemento,
          xBairro: input.emitente.endereco.bairro,
          cMun: input.emitente.endereco.codigoMunicipio,
          xMun: input.emitente.endereco.nomeMunicipio,
          UF: input.emitente.endereco.uf,
          CEP: input.emitente.endereco.cep.replace(/\D/g, ''),
          fone: input.emitente.endereco.telefone?.replace(/\D/g, ''),
        },
        IE: input.emitente.inscricaoEstadual.replace(/\D/g, ''),
        IM: input.emitente.inscricaoMunicipal?.replace(/\D/g, ''),
        CRT: input.emitente.crt,
      },
      dest: {
        [input.destinatario.cpfCnpj.length > 11 ? 'CNPJ' : 'CPF']:
          input.destinatario.cpfCnpj.replace(/\D/g, ''),
        xNome: input.destinatario.nome,
        enderDest: input.destinatario.endereco ? {
          xLgr: input.destinatario.endereco.logradouro,
          nro: input.destinatario.endereco.numero,
          xCpl: input.destinatario.endereco.complemento,
          xBairro: input.destinatario.endereco.bairro,
          cMun: input.destinatario.endereco.codigoMunicipio,
          xMun: input.destinatario.endereco.nomeMunicipio,
          UF: input.destinatario.endereco.uf,
          CEP: input.destinatario.endereco.cep.replace(/\D/g, ''),
          fone: input.destinatario.endereco.telefone?.replace(/\D/g, ''),
        } : undefined,
        indIEDest: input.destinatario.indicadorIE,
        IE: input.destinatario.inscricaoEstadual?.replace(/\D/g, ''),
        email: input.destinatario.email,
      },
      det: input.itens.map((item, index) => ({
        nItem: (index + 1).toString(),
        prod: {
          cProd: item.codigo,
          cEAN: 'SEM GTIN',
          xProd: item.descricao,
          NCM: item.ncm,
          CFOP: item.cfop,
          uCom: item.unidade,
          qCom: item.quantidade.toFixed(4),
          vUnCom: item.valorUnitario.toFixed(10),
          vProd: item.valorTotal.toFixed(2),
          cEANTrib: 'SEM GTIN',
          uTrib: item.unidade,
          qTrib: item.quantidade.toFixed(4),
          vUnTrib: item.valorUnitario.toFixed(10),
          indTot: '1',
        },
        imposto: {
          ICMS: {
            orig: (item.icmsOrigem || '0') as any,
            CST: item.icmsCST,
            CSOSN: item.icmsCSOSN,
            vBC: (item.icmsBaseCalculo || 0).toFixed(2),
            pICMS: (item.icmsAliquota || 0).toFixed(2),
            vICMS: (item.icmsValor || 0).toFixed(2),
          },
          PIS: {
            CST: item.pisCST || '99',
            vBC: (item.pisBaseCalculo || 0).toFixed(2),
            pPIS: (item.pisAliquota || 0).toFixed(2),
            vPIS: (item.pisValor || 0).toFixed(2),
          },
          COFINS: {
            CST: item.cofinsCST || '99',
            vBC: (item.cofinsBaseCalculo || 0).toFixed(2),
            pCOFINS: (item.cofinsAliquota || 0).toFixed(2),
            vCOFINS: (item.cofinsValor || 0).toFixed(2),
          },
        },
      })),
      total: {
        ICMSTot: {
          vBC: valorICMS > 0 ? valorProdutos.toFixed(2) : '0.00',
          vICMS: valorICMS.toFixed(2),
          vICMSDeson: '0.00',
          vFCP: '0.00',
          vBCST: '0.00',
          vST: '0.00',
          vFCPST: '0.00',
          vFCPSTRet: '0.00',
          vProd: valorProdutos.toFixed(2),
          vFrete: '0.00',
          vSeg: '0.00',
          vDesc: '0.00',
          vII: '0.00',
          vIPI: '0.00',
          vIPIDevol: '0.00',
          vPIS: valorPIS.toFixed(2),
          vCOFINS: valorCOFINS.toFixed(2),
          vOutro: '0.00',
          vNF: valorProdutos.toFixed(2),
        },
      },
      transp: {
        modFrete: '9', // Sem frete
      },
      pag: {
        detPag: [
          {
            tPag: input.formaPagamento,
            vPag: input.valorPagamento.toFixed(2),
          },
        ],
      },
      infAdic: input.informacoesAdicionais ? {
        infCpl: input.informacoesAdicionais,
      } : undefined,
    };
  }

  private mapearFormaPagamento(metodo?: string): string {
    const mapa: Record<string, string> = {
      'dinheiro': '01',
      'cheque': '02',
      'cartao_credito': '03',
      'cartao_debito': '04',
      'pix': '17',
      'boleto': '15',
      'transferencia': '18',
    };
    return mapa[metodo?.toLowerCase() || ''] || '99';
  }
}
