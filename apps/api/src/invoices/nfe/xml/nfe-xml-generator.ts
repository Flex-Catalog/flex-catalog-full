import {
  NFeData,
  NFeChaveAcesso,
  CODIGOS_UF,
} from '../types/nfe.types';

/**
 * Gerador de XML da NFe conforme layout 4.00 da SEFAZ
 */
export class NFeXmlGenerator {
  private readonly versao = '4.00';
  private readonly xmlns = 'http://www.portalfiscal.inf.br/nfe';

  /**
   * Gera a chave de acesso da NFe (44 dígitos)
   */
  gerarChaveAcesso(dados: Omit<NFeChaveAcesso, 'cDV'>): string {
    const chave =
      dados.cUF.padStart(2, '0') +
      dados.AAMM +
      dados.CNPJ.padStart(14, '0') +
      dados.mod.padStart(2, '0') +
      dados.serie.padStart(3, '0') +
      dados.nNF.padStart(9, '0') +
      dados.tpEmis +
      dados.cNF.padStart(8, '0');

    const dv = this.calcularDigitoVerificador(chave);
    return chave + dv;
  }

  /**
   * Calcula o dígito verificador da chave de acesso (módulo 11)
   */
  private calcularDigitoVerificador(chave: string): string {
    let peso = 2;
    let soma = 0;

    for (let i = chave.length - 1; i >= 0; i--) {
      soma += parseInt(chave[i]) * peso;
      peso = peso === 9 ? 2 : peso + 1;
    }

    const resto = soma % 11;
    const dv = resto === 0 || resto === 1 ? 0 : 11 - resto;
    return dv.toString();
  }

  /**
   * Gera código numérico aleatório de 8 dígitos
   */
  gerarCodigoNumerico(): string {
    return Math.floor(Math.random() * 100000000)
      .toString()
      .padStart(8, '0');
  }

  /**
   * Gera o XML completo da NFe
   */
  gerarXml(nfe: NFeData, chaveAcesso: string): string {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<NFe xmlns="${this.xmlns}">
  <infNFe versao="${this.versao}" Id="NFe${chaveAcesso}">
    ${this.gerarIde(nfe)}
    ${this.gerarEmit(nfe)}
    ${nfe.dest ? this.gerarDest(nfe) : ''}
    ${this.gerarDet(nfe)}
    ${this.gerarTotal(nfe)}
    ${this.gerarTransp(nfe)}
    ${nfe.cobr ? this.gerarCobr(nfe) : ''}
    ${this.gerarPag(nfe)}
    ${nfe.infAdic ? this.gerarInfAdic(nfe) : ''}
  </infNFe>
</NFe>`;

    return this.formatarXml(xml);
  }

  private gerarIde(nfe: NFeData): string {
    const ide = nfe.ide;
    return `<ide>
      <cUF>${ide.cUF}</cUF>
      <cNF>${ide.cNF}</cNF>
      <natOp>${this.escaparXml(ide.natOp)}</natOp>
      <mod>${ide.mod}</mod>
      <serie>${ide.serie}</serie>
      <nNF>${ide.nNF}</nNF>
      <dhEmi>${ide.dhEmi}</dhEmi>
      ${ide.dhSaiEnt ? `<dhSaiEnt>${ide.dhSaiEnt}</dhSaiEnt>` : ''}
      <tpNF>${ide.tpNF}</tpNF>
      <idDest>${ide.idDest}</idDest>
      <cMunFG>${ide.cMunFG}</cMunFG>
      <tpImp>${ide.tpImp}</tpImp>
      <tpEmis>${ide.tpEmis}</tpEmis>
      <cDV>${ide.cDV}</cDV>
      <tpAmb>${ide.tpAmb}</tpAmb>
      <finNFe>${ide.finNFe}</finNFe>
      <indFinal>${ide.indFinal}</indFinal>
      <indPres>${ide.indPres}</indPres>
      ${ide.indIntermed ? `<indIntermed>${ide.indIntermed}</indIntermed>` : ''}
      <procEmi>${ide.procEmi}</procEmi>
      <verProc>${ide.verProc}</verProc>
    </ide>`;
  }

  private gerarEmit(nfe: NFeData): string {
    const emit = nfe.emit;
    return `<emit>
      ${emit.CNPJ ? `<CNPJ>${emit.CNPJ}</CNPJ>` : `<CPF>${emit.CPF}</CPF>`}
      <xNome>${this.escaparXml(emit.xNome)}</xNome>
      ${emit.xFant ? `<xFant>${this.escaparXml(emit.xFant)}</xFant>` : ''}
      ${this.gerarEndereco('enderEmit', emit.enderEmit)}
      <IE>${emit.IE}</IE>
      ${emit.IEST ? `<IEST>${emit.IEST}</IEST>` : ''}
      ${emit.IM ? `<IM>${emit.IM}</IM>` : ''}
      ${emit.CNAE ? `<CNAE>${emit.CNAE}</CNAE>` : ''}
      <CRT>${emit.CRT}</CRT>
    </emit>`;
  }

  private gerarDest(nfe: NFeData): string {
    const dest = nfe.dest!;
    return `<dest>
      ${dest.CNPJ ? `<CNPJ>${dest.CNPJ}</CNPJ>` : ''}
      ${dest.CPF ? `<CPF>${dest.CPF}</CPF>` : ''}
      ${dest.idEstrangeiro ? `<idEstrangeiro>${dest.idEstrangeiro}</idEstrangeiro>` : ''}
      ${dest.xNome ? `<xNome>${this.escaparXml(dest.xNome)}</xNome>` : ''}
      ${dest.enderDest ? this.gerarEndereco('enderDest', dest.enderDest) : ''}
      <indIEDest>${dest.indIEDest}</indIEDest>
      ${dest.IE ? `<IE>${dest.IE}</IE>` : ''}
      ${dest.email ? `<email>${dest.email}</email>` : ''}
    </dest>`;
  }

  private gerarEndereco(tag: string, end: any): string {
    return `<${tag}>
      <xLgr>${this.escaparXml(end.xLgr)}</xLgr>
      <nro>${end.nro}</nro>
      ${end.xCpl ? `<xCpl>${this.escaparXml(end.xCpl)}</xCpl>` : ''}
      <xBairro>${this.escaparXml(end.xBairro)}</xBairro>
      <cMun>${end.cMun}</cMun>
      <xMun>${this.escaparXml(end.xMun)}</xMun>
      <UF>${end.UF}</UF>
      <CEP>${end.CEP}</CEP>
      ${end.cPais ? `<cPais>${end.cPais}</cPais>` : '<cPais>1058</cPais>'}
      ${end.xPais ? `<xPais>${end.xPais}</xPais>` : '<xPais>Brasil</xPais>'}
      ${end.fone ? `<fone>${end.fone}</fone>` : ''}
    </${tag}>`;
  }

  private gerarDet(nfe: NFeData): string {
    return nfe.det
      .map(
        (item) => `<det nItem="${item.nItem}">
      <prod>
        <cProd>${item.prod.cProd}</cProd>
        <cEAN>${item.prod.cEAN}</cEAN>
        <xProd>${this.escaparXml(item.prod.xProd)}</xProd>
        <NCM>${item.prod.NCM}</NCM>
        ${item.prod.CEST ? `<CEST>${item.prod.CEST}</CEST>` : ''}
        <CFOP>${item.prod.CFOP}</CFOP>
        <uCom>${item.prod.uCom}</uCom>
        <qCom>${item.prod.qCom}</qCom>
        <vUnCom>${item.prod.vUnCom}</vUnCom>
        <vProd>${item.prod.vProd}</vProd>
        <cEANTrib>${item.prod.cEANTrib}</cEANTrib>
        <uTrib>${item.prod.uTrib}</uTrib>
        <qTrib>${item.prod.qTrib}</qTrib>
        <vUnTrib>${item.prod.vUnTrib}</vUnTrib>
        ${item.prod.vDesc ? `<vDesc>${item.prod.vDesc}</vDesc>` : ''}
        <indTot>${item.prod.indTot}</indTot>
      </prod>
      ${this.gerarImposto(item.imposto)}
      ${item.infAdProd ? `<infAdProd>${this.escaparXml(item.infAdProd)}</infAdProd>` : ''}
    </det>`,
      )
      .join('\n');
  }

  private gerarImposto(imposto: any): string {
    return `<imposto>
      ${imposto.vTotTrib ? `<vTotTrib>${imposto.vTotTrib}</vTotTrib>` : ''}
      <ICMS>
        ${this.gerarICMS(imposto.ICMS)}
      </ICMS>
      <PIS>
        ${this.gerarPIS(imposto.PIS)}
      </PIS>
      <COFINS>
        ${this.gerarCOFINS(imposto.COFINS)}
      </COFINS>
    </imposto>`;
  }

  private gerarICMS(icms: any): string {
    // Simplificado para ICMS00 (tributação normal)
    if (icms.CST === '00') {
      return `<ICMS00>
        <orig>${icms.orig}</orig>
        <CST>${icms.CST}</CST>
        <modBC>${icms.modBC || '3'}</modBC>
        <vBC>${icms.vBC}</vBC>
        <pICMS>${icms.pICMS}</pICMS>
        <vICMS>${icms.vICMS}</vICMS>
      </ICMS00>`;
    }

    // ICMS para Simples Nacional
    if (icms.CSOSN) {
      return `<ICMSSN102>
        <orig>${icms.orig}</orig>
        <CSOSN>${icms.CSOSN}</CSOSN>
      </ICMSSN102>`;
    }

    // Fallback para ICMS00
    return `<ICMS00>
      <orig>${icms.orig || '0'}</orig>
      <CST>00</CST>
      <modBC>3</modBC>
      <vBC>${icms.vBC || '0.00'}</vBC>
      <pICMS>${icms.pICMS || '0.00'}</pICMS>
      <vICMS>${icms.vICMS || '0.00'}</vICMS>
    </ICMS00>`;
  }

  private gerarPIS(pis: any): string {
    if (pis.CST === '01' || pis.CST === '02') {
      return `<PISAliq>
        <CST>${pis.CST}</CST>
        <vBC>${pis.vBC}</vBC>
        <pPIS>${pis.pPIS}</pPIS>
        <vPIS>${pis.vPIS}</vPIS>
      </PISAliq>`;
    }

    return `<PISOutr>
      <CST>${pis.CST || '99'}</CST>
      <vBC>${pis.vBC || '0.00'}</vBC>
      <pPIS>${pis.pPIS || '0.00'}</pPIS>
      <vPIS>${pis.vPIS || '0.00'}</vPIS>
    </PISOutr>`;
  }

  private gerarCOFINS(cofins: any): string {
    if (cofins.CST === '01' || cofins.CST === '02') {
      return `<COFINSAliq>
        <CST>${cofins.CST}</CST>
        <vBC>${cofins.vBC}</vBC>
        <pCOFINS>${cofins.pCOFINS}</pCOFINS>
        <vCOFINS>${cofins.vCOFINS}</vCOFINS>
      </COFINSAliq>`;
    }

    return `<COFINSOutr>
      <CST>${cofins.CST || '99'}</CST>
      <vBC>${cofins.vBC || '0.00'}</vBC>
      <pCOFINS>${cofins.pCOFINS || '0.00'}</pCOFINS>
      <vCOFINS>${cofins.vCOFINS || '0.00'}</vCOFINS>
    </COFINSOutr>`;
  }

  private gerarTotal(nfe: NFeData): string {
    const tot = nfe.total.ICMSTot;
    return `<total>
      <ICMSTot>
        <vBC>${tot.vBC}</vBC>
        <vICMS>${tot.vICMS}</vICMS>
        <vICMSDeson>${tot.vICMSDeson}</vICMSDeson>
        <vFCP>${tot.vFCP}</vFCP>
        <vBCST>${tot.vBCST}</vBCST>
        <vST>${tot.vST}</vST>
        <vFCPST>${tot.vFCPST}</vFCPST>
        <vFCPSTRet>${tot.vFCPSTRet}</vFCPSTRet>
        <vProd>${tot.vProd}</vProd>
        <vFrete>${tot.vFrete}</vFrete>
        <vSeg>${tot.vSeg}</vSeg>
        <vDesc>${tot.vDesc}</vDesc>
        <vII>${tot.vII}</vII>
        <vIPI>${tot.vIPI}</vIPI>
        <vIPIDevol>${tot.vIPIDevol}</vIPIDevol>
        <vPIS>${tot.vPIS}</vPIS>
        <vCOFINS>${tot.vCOFINS}</vCOFINS>
        <vOutro>${tot.vOutro}</vOutro>
        <vNF>${tot.vNF}</vNF>
        ${tot.vTotTrib ? `<vTotTrib>${tot.vTotTrib}</vTotTrib>` : ''}
      </ICMSTot>
    </total>`;
  }

  private gerarTransp(nfe: NFeData): string {
    const transp = nfe.transp;
    return `<transp>
      <modFrete>${transp.modFrete}</modFrete>
      ${
        transp.transporta
          ? `<transporta>
        ${transp.transporta.CNPJ ? `<CNPJ>${transp.transporta.CNPJ}</CNPJ>` : ''}
        ${transp.transporta.xNome ? `<xNome>${this.escaparXml(transp.transporta.xNome)}</xNome>` : ''}
        ${transp.transporta.xEnder ? `<xEnder>${this.escaparXml(transp.transporta.xEnder)}</xEnder>` : ''}
        ${transp.transporta.xMun ? `<xMun>${this.escaparXml(transp.transporta.xMun)}</xMun>` : ''}
        ${transp.transporta.UF ? `<UF>${transp.transporta.UF}</UF>` : ''}
      </transporta>`
          : ''
      }
    </transp>`;
  }

  private gerarCobr(nfe: NFeData): string {
    const cobr = nfe.cobr!;
    return `<cobr>
      ${
        cobr.fat
          ? `<fat>
        ${cobr.fat.nFat ? `<nFat>${cobr.fat.nFat}</nFat>` : ''}
        ${cobr.fat.vOrig ? `<vOrig>${cobr.fat.vOrig}</vOrig>` : ''}
        ${cobr.fat.vDesc ? `<vDesc>${cobr.fat.vDesc}</vDesc>` : ''}
        ${cobr.fat.vLiq ? `<vLiq>${cobr.fat.vLiq}</vLiq>` : ''}
      </fat>`
          : ''
      }
      ${
        cobr.dup
          ?.map(
            (d) => `<dup>
        ${d.nDup ? `<nDup>${d.nDup}</nDup>` : ''}
        ${d.dVenc ? `<dVenc>${d.dVenc}</dVenc>` : ''}
        ${d.vDup ? `<vDup>${d.vDup}</vDup>` : ''}
      </dup>`,
          )
          .join('\n') || ''
      }
    </cobr>`;
  }

  private gerarPag(nfe: NFeData): string {
    return `<pag>
      ${nfe.pag.detPag
        .map(
          (p) => `<detPag>
        ${p.indPag !== undefined ? `<indPag>${p.indPag}</indPag>` : ''}
        <tPag>${p.tPag}</tPag>
        <vPag>${p.vPag}</vPag>
      </detPag>`,
        )
        .join('\n')}
      ${nfe.pag.vTroco ? `<vTroco>${nfe.pag.vTroco}</vTroco>` : ''}
    </pag>`;
  }

  private gerarInfAdic(nfe: NFeData): string {
    const infAdic = nfe.infAdic!;
    return `<infAdic>
      ${infAdic.infAdFisco ? `<infAdFisco>${this.escaparXml(infAdic.infAdFisco)}</infAdFisco>` : ''}
      ${infAdic.infCpl ? `<infCpl>${this.escaparXml(infAdic.infCpl)}</infCpl>` : ''}
    </infAdic>`;
  }

  private escaparXml(texto: string): string {
    return texto
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  private formatarXml(xml: string): string {
    // Remove espaços extras e linhas vazias
    return xml
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .join('\n');
  }

  /**
   * Valida a estrutura básica da NFe
   */
  validarNFe(nfe: NFeData): { valido: boolean; erros: string[] } {
    const erros: string[] = [];

    // Validações obrigatórias
    if (!nfe.ide) erros.push('Identificação (ide) é obrigatória');
    if (!nfe.emit) erros.push('Emitente (emit) é obrigatório');
    if (!nfe.det || nfe.det.length === 0) erros.push('Pelo menos um item (det) é obrigatório');
    if (!nfe.total) erros.push('Totais (total) é obrigatório');
    if (!nfe.transp) erros.push('Transporte (transp) é obrigatório');
    if (!nfe.pag) erros.push('Pagamento (pag) é obrigatório');

    // Validar emitente
    if (nfe.emit && !nfe.emit.CNPJ && !nfe.emit.CPF) {
      erros.push('CNPJ ou CPF do emitente é obrigatório');
    }

    // Validar itens
    nfe.det?.forEach((item, index) => {
      if (!item.prod.cProd) erros.push(`Item ${index + 1}: código do produto é obrigatório`);
      if (!item.prod.xProd) erros.push(`Item ${index + 1}: descrição do produto é obrigatória`);
      if (!item.prod.NCM) erros.push(`Item ${index + 1}: NCM é obrigatório`);
      if (!item.prod.CFOP) erros.push(`Item ${index + 1}: CFOP é obrigatório`);
    });

    return {
      valido: erros.length === 0,
      erros,
    };
  }
}
