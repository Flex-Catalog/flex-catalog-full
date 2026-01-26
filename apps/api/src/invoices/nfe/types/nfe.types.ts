/**
 * Tipos da NFe conforme layout 4.00 da SEFAZ
 * Baseado no Manual de Orientação do Contribuinte - MOC
 * https://www.nfe.fazenda.gov.br/portal/principal.aspx
 */

// ===== IDENTIFICAÇÃO DA NFE (ide) =====
export interface NFeIdentificacao {
  cUF: string; // Código da UF do emitente (tabela IBGE)
  cNF: string; // Código numérico que compõe a chave de acesso
  natOp: string; // Descrição da Natureza da Operação
  mod: '55' | '65'; // Modelo do documento (55=NFe, 65=NFCe)
  serie: string; // Série do documento fiscal
  nNF: string; // Número do documento fiscal
  dhEmi: string; // Data e hora de emissão (formato UTC)
  dhSaiEnt?: string; // Data e hora de saída/entrada
  tpNF: '0' | '1'; // Tipo de operação (0=Entrada, 1=Saída)
  idDest: '1' | '2' | '3'; // Identificador de destino (1=Interna, 2=Interestadual, 3=Exterior)
  cMunFG: string; // Código do município de ocorrência do fato gerador
  tpImp: '0' | '1' | '2' | '3' | '4' | '5'; // Formato de impressão do DANFE
  tpEmis: '1' | '2' | '3' | '4' | '5' | '6' | '7' | '9'; // Tipo de emissão
  cDV: string; // Dígito verificador da chave de acesso
  tpAmb: '1' | '2'; // Ambiente (1=Produção, 2=Homologação)
  finNFe: '1' | '2' | '3' | '4'; // Finalidade (1=Normal, 2=Complementar, 3=Ajuste, 4=Devolução)
  indFinal: '0' | '1'; // Consumidor final (0=Não, 1=Sim)
  indPres: '0' | '1' | '2' | '3' | '4' | '5' | '9'; // Indicador de presença do comprador
  indIntermed?: '0' | '1'; // Indicador de intermediador
  procEmi: '0' | '1' | '2' | '3'; // Processo de emissão (0=Aplicativo do contribuinte)
  verProc: string; // Versão do processo de emissão
}

// ===== EMITENTE (emit) =====
export interface NFeEmitente {
  CNPJ?: string; // CNPJ do emitente
  CPF?: string; // CPF do emitente (para pessoa física)
  xNome: string; // Razão social ou nome do emitente
  xFant?: string; // Nome fantasia
  enderEmit: NFeEndereco;
  IE: string; // Inscrição Estadual
  IEST?: string; // IE do Substituto Tributário
  IM?: string; // Inscrição Municipal
  CNAE?: string; // CNAE fiscal
  CRT: '1' | '2' | '3'; // Código de Regime Tributário (1=Simples, 2=Simples Excesso, 3=Normal)
}

// ===== DESTINATÁRIO (dest) =====
export interface NFeDestinatario {
  CNPJ?: string; // CNPJ do destinatário
  CPF?: string; // CPF do destinatário
  idEstrangeiro?: string; // Identificação do estrangeiro
  xNome?: string; // Razão social ou nome do destinatário
  enderDest?: NFeEndereco;
  indIEDest: '1' | '2' | '9'; // Indicador da IE (1=Contribuinte, 2=Isento, 9=Não contribuinte)
  IE?: string; // Inscrição Estadual do destinatário
  ISUF?: string; // Inscrição na SUFRAMA
  IM?: string; // Inscrição Municipal
  email?: string; // Email do destinatário
}

// ===== ENDEREÇO =====
export interface NFeEndereco {
  xLgr: string; // Logradouro
  nro: string; // Número
  xCpl?: string; // Complemento
  xBairro: string; // Bairro
  cMun: string; // Código do município (IBGE)
  xMun: string; // Nome do município
  UF: string; // Sigla da UF
  CEP: string; // CEP
  cPais?: string; // Código do país
  xPais?: string; // Nome do país
  fone?: string; // Telefone
}

// ===== PRODUTO (det/prod) =====
export interface NFeProduto {
  cProd: string; // Código do produto
  cEAN: string; // GTIN (código de barras) - usar "SEM GTIN" se não houver
  xProd: string; // Descrição do produto
  NCM: string; // Código NCM
  NVE?: string; // Nomenclatura de Valor Aduaneiro
  CEST?: string; // Código Especificador da Substituição Tributária
  indEscala?: 'S' | 'N'; // Indicador de produção em escala relevante
  CNPJFab?: string; // CNPJ do fabricante
  cBenef?: string; // Código de benefício fiscal
  EXTIPI?: string; // EX_TIPI
  CFOP: string; // Código Fiscal de Operações e Prestações
  uCom: string; // Unidade comercial
  qCom: string; // Quantidade comercial
  vUnCom: string; // Valor unitário de comercialização
  vProd: string; // Valor total bruto do produto
  cEANTrib: string; // GTIN da unidade tributável
  uTrib: string; // Unidade tributável
  qTrib: string; // Quantidade tributável
  vUnTrib: string; // Valor unitário de tributação
  vFrete?: string; // Valor do frete
  vSeg?: string; // Valor do seguro
  vDesc?: string; // Valor do desconto
  vOutro?: string; // Outras despesas acessórias
  indTot: '0' | '1'; // Indica se o valor do item compõe o valor total da NFe
  xPed?: string; // Número do pedido de compra
  nItemPed?: string; // Item do pedido de compra
}

// ===== IMPOSTO (det/imposto) =====
export interface NFeImposto {
  vTotTrib?: string; // Valor aproximado total de tributos
  ICMS: NFeICMS;
  IPI?: NFeIPI;
  PIS: NFePIS;
  COFINS: NFeCOFINS;
}

// ===== ICMS =====
export interface NFeICMS {
  orig: '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8'; // Origem da mercadoria
  CST?: string; // Código de Situação Tributária
  CSOSN?: string; // Código de Situação da Operação - Simples Nacional
  modBC?: '0' | '1' | '2' | '3'; // Modalidade de determinação da BC do ICMS
  vBC?: string; // Valor da BC do ICMS
  pICMS?: string; // Alíquota do ICMS
  vICMS?: string; // Valor do ICMS
  pRedBC?: string; // Percentual de redução da BC
  vICMSDeson?: string; // Valor do ICMS desonerado
  motDesICMS?: string; // Motivo da desoneração do ICMS
  // ... outros campos conforme CST
}

// ===== IPI =====
export interface NFeIPI {
  cEnq: string; // Código de enquadramento legal do IPI
  CST: string; // Código da situação tributária do IPI
  vBC?: string; // Valor da BC do IPI
  pIPI?: string; // Alíquota do IPI
  vIPI?: string; // Valor do IPI
}

// ===== PIS =====
export interface NFePIS {
  CST: string; // Código de Situação Tributária do PIS
  vBC?: string; // Valor da Base de Cálculo do PIS
  pPIS?: string; // Alíquota do PIS (em percentual)
  vPIS?: string; // Valor do PIS
}

// ===== COFINS =====
export interface NFeCOFINS {
  CST: string; // Código de Situação Tributária da COFINS
  vBC?: string; // Valor da Base de Cálculo da COFINS
  pCOFINS?: string; // Alíquota da COFINS (em percentual)
  vCOFINS?: string; // Valor da COFINS
}

// ===== TOTAIS (total) =====
export interface NFeTotais {
  ICMSTot: {
    vBC: string; // Base de cálculo do ICMS
    vICMS: string; // Valor total do ICMS
    vICMSDeson: string; // Valor total do ICMS desonerado
    vFCPUFDest?: string; // Valor total do ICMS relativo Fundo de Combate à Pobreza
    vICMSUFDest?: string; // Valor total do ICMS Interestadual para a UF de destino
    vICMSUFRemet?: string; // Valor total do ICMS Interestadual para a UF do remetente
    vFCP: string; // Valor total do FCP
    vBCST: string; // Base de cálculo do ICMS ST
    vST: string; // Valor total do ICMS ST
    vFCPST: string; // Valor total do FCP retido por ST
    vFCPSTRet: string; // Valor total do FCP retido anteriormente por ST
    vProd: string; // Valor total dos produtos
    vFrete: string; // Valor total do frete
    vSeg: string; // Valor total do seguro
    vDesc: string; // Valor total do desconto
    vII: string; // Valor total do II
    vIPI: string; // Valor total do IPI
    vIPIDevol: string; // Valor total do IPI devolvido
    vPIS: string; // Valor total do PIS
    vCOFINS: string; // Valor total da COFINS
    vOutro: string; // Outras despesas acessórias
    vNF: string; // Valor total da NFe
    vTotTrib?: string; // Valor aproximado total de tributos
  };
}

// ===== TRANSPORTE (transp) =====
export interface NFeTransporte {
  modFrete: '0' | '1' | '2' | '3' | '4' | '9'; // Modalidade do frete
  transporta?: {
    CNPJ?: string;
    CPF?: string;
    xNome?: string;
    IE?: string;
    xEnder?: string;
    xMun?: string;
    UF?: string;
  };
  veicTransp?: {
    placa: string;
    UF: string;
    RNTC?: string;
  };
  vol?: Array<{
    qVol?: string;
    esp?: string;
    marca?: string;
    nVol?: string;
    pesoL?: string;
    pesoB?: string;
  }>;
}

// ===== COBRANÇA (cobr) =====
export interface NFeCobranca {
  fat?: {
    nFat?: string; // Número da fatura
    vOrig?: string; // Valor original da fatura
    vDesc?: string; // Valor do desconto da fatura
    vLiq?: string; // Valor líquido da fatura
  };
  dup?: Array<{
    nDup?: string; // Número da duplicata
    dVenc?: string; // Data de vencimento
    vDup?: string; // Valor da duplicata
  }>;
}

// ===== PAGAMENTO (pag) =====
export interface NFePagamento {
  detPag: Array<{
    indPag?: '0' | '1'; // Indicador da forma de pagamento (0=À vista, 1=A prazo)
    tPag: string; // Forma de pagamento
    vPag: string; // Valor do pagamento
    card?: {
      tpIntegra: '1' | '2'; // Tipo de integração
      CNPJ?: string;
      tBand?: string;
      cAut?: string;
    };
  }>;
  vTroco?: string; // Valor do troco
}

// ===== INFORMAÇÕES ADICIONAIS (infAdic) =====
export interface NFeInformacoesAdicionais {
  infAdFisco?: string; // Informações adicionais de interesse do Fisco
  infCpl?: string; // Informações complementares de interesse do contribuinte
  obsCont?: Array<{
    xCampo: string;
    xTexto: string;
  }>;
  obsFisco?: Array<{
    xCampo: string;
    xTexto: string;
  }>;
}

// ===== NFE COMPLETA =====
export interface NFeData {
  ide: NFeIdentificacao;
  emit: NFeEmitente;
  dest?: NFeDestinatario;
  det: Array<{
    nItem: string;
    prod: NFeProduto;
    imposto: NFeImposto;
    infAdProd?: string; // Informações adicionais do produto
  }>;
  total: NFeTotais;
  transp: NFeTransporte;
  cobr?: NFeCobranca;
  pag: NFePagamento;
  infAdic?: NFeInformacoesAdicionais;
}

// ===== CHAVE DE ACESSO =====
export interface NFeChaveAcesso {
  cUF: string; // Código da UF
  AAMM: string; // Ano e mês de emissão
  CNPJ: string; // CNPJ do emitente
  mod: string; // Modelo do documento
  serie: string; // Série
  nNF: string; // Número da NFe
  tpEmis: string; // Tipo de emissão
  cNF: string; // Código numérico
  cDV: string; // Dígito verificador
}

// ===== RESPOSTA DA SEFAZ =====
export interface NFeRetornoSefaz {
  cStat: string; // Código do status da resposta
  xMotivo: string; // Descrição do status
  chNFe?: string; // Chave de acesso da NFe
  nProt?: string; // Número do protocolo
  dhRecbto?: string; // Data e hora do recebimento
  xml?: string; // XML autorizado
  pdf?: string; // DANFE em base64
}

// ===== STATUS DA NFE =====
export type NFeStatus =
  | 'PENDENTE'
  | 'AUTORIZADA'
  | 'REJEITADA'
  | 'DENEGADA'
  | 'CANCELADA'
  | 'INUTILIZADA';

// ===== CÓDIGOS DE UF =====
export const CODIGOS_UF: Record<string, string> = {
  AC: '12',
  AL: '27',
  AP: '16',
  AM: '13',
  BA: '29',
  CE: '23',
  DF: '53',
  ES: '32',
  GO: '52',
  MA: '21',
  MT: '51',
  MS: '50',
  MG: '31',
  PA: '15',
  PB: '25',
  PR: '41',
  PE: '26',
  PI: '22',
  RJ: '33',
  RN: '24',
  RS: '43',
  RO: '11',
  RR: '14',
  SC: '42',
  SP: '35',
  SE: '28',
  TO: '17',
};

// ===== FORMAS DE PAGAMENTO =====
export const FORMAS_PAGAMENTO: Record<string, string> = {
  '01': 'Dinheiro',
  '02': 'Cheque',
  '03': 'Cartão de Crédito',
  '04': 'Cartão de Débito',
  '05': 'Crédito Loja',
  '10': 'Vale Alimentação',
  '11': 'Vale Refeição',
  '12': 'Vale Presente',
  '13': 'Vale Combustível',
  '14': 'Duplicata Mercantil',
  '15': 'Boleto Bancário',
  '16': 'Depósito Bancário',
  '17': 'Pagamento Instantâneo (PIX)',
  '18': 'Transferência bancária, Carteira Digital',
  '19': 'Programa de fidelidade, Cashback, Crédito Virtual',
  '90': 'Sem pagamento',
  '99': 'Outros',
};
