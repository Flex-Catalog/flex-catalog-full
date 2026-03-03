import { Injectable } from '@nestjs/common';

/**
 * PDF Generator Service for Service Orders
 * - SRP: Only generates PDF documents
 * - Generates the internal service receipt (like the physical form)
 *
 * Uses HTML-to-PDF approach (can swap to pdfkit/puppeteer later)
 */
@Injectable()
export class PdfGeneratorService {
  /**
   * Generates the internal service receipt HTML
   * Similar to the physical "Nota de Servico" form
   */
  generateServiceReceiptHtml(data: Record<string, unknown>): string {
    const startTime = data.startTime ? new Date(data.startTime as string) : null;
    const endTime = data.endTime ? new Date(data.endTime as string) : null;

    const formatTime = (date: Date | null): string => {
      if (!date) return '--:--';
      return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
    };

    const formatDate = (date: Date | null): string => {
      if (!date) return '--/--/----';
      return date.toLocaleDateString('pt-BR');
    };

    const people = (data.transportedPeople as any[]) ?? [];
    const peopleRows = people
      .map(
        (p: any, i: number) =>
          `<tr><td>${i + 1}</td><td>${p.name}</td><td>${p.role ?? ''}</td><td>${p.document ?? ''}</td></tr>`,
      )
      .join('');

    const items = (data.items as any[]) ?? [];
    const itemsRows = items
      .map(
        (it: any) =>
          `<tr><td>${it.name}</td><td style="text-align:center">${it.qty}</td><td style="text-align:right">R$ ${(it.unitCents / 100).toFixed(2)}</td><td style="text-align:right">R$ ${(it.totalCents / 100).toFixed(2)}</td></tr>`,
      )
      .join('');

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Nota de Servico - ${data.orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; color: #333; }
  .header { text-align: center; border: 2px solid #003366; padding: 10px; margin-bottom: 15px; }
  .header h1 { color: #003366; font-size: 18px; margin-bottom: 5px; }
  .header .subtitle { font-size: 12px; color: #666; }
  .receipt-number { text-align: right; font-size: 16px; font-weight: bold; color: #c00; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
  table td, table th { border: 1px solid #999; padding: 5px 8px; }
  table th { background: #003366; color: white; text-align: left; font-size: 10px; text-transform: uppercase; }
  .label { font-weight: bold; background: #f0f0f0; width: 180px; font-size: 10px; text-transform: uppercase; }
  .value { font-size: 12px; }
  .section-title { background: #003366; color: white; padding: 5px 10px; font-weight: bold; font-size: 11px; text-transform: uppercase; margin-top: 10px; }
  .totals td { font-size: 13px; font-weight: bold; }
  .totals .total-value { font-size: 16px; color: #003366; }
  .footer { margin-top: 30px; display: flex; justify-content: space-between; }
  .signature { border-top: 1px solid #333; width: 200px; text-align: center; padding-top: 5px; font-size: 10px; }
  .satisfaction { margin-top: 15px; text-align: center; }
  .smiley { font-size: 24px; margin: 0 10px; }
  @media print { body { padding: 10px; } }
</style>
</head>
<body>

<div class="header">
  <h1>NOTA DE SERVICO EXECUTADO</h1>
  <div class="subtitle">FINISHED SERVICE RECEIPT - SERIE UNICA</div>
</div>

<div class="receipt-number">
  N&ordm; ${data.orderNumber} &nbsp;&nbsp; Data: ${formatDate(data.serviceDate ? new Date(data.serviceDate as string) : null)}
</div>

<table>
  <tr><td class="label">Hora de Saida / Leaving Time</td><td class="value">${formatTime(startTime)}</td><td class="label">Hora de Retorno / Arrival Time</td><td class="value">${formatTime(endTime)}</td></tr>
  <tr><td class="label">Duracao / Duration</td><td class="value" colspan="3">${data.durationFormatted ?? 'Em andamento'}</td></tr>
</table>

<div class="section-title">Dados do Servico / Service Details</div>
<table>
  <tr><td class="label">Tipo de Servico / Service Type</td><td class="value" colspan="3">${data.serviceTypeLabel}</td></tr>
  <tr><td class="label">Descricao / Description</td><td class="value" colspan="3">${data.serviceDescription}</td></tr>
  <tr><td class="label">Periodo / Period</td><td class="value">${data.servicePeriodLabel}</td><td class="label">Voucher</td><td class="value">${data.voucherNumber ?? '-'}</td></tr>
</table>

<div class="section-title">Navio / Vessel</div>
<table>
  <tr><td class="label">Nome do Navio / Vessel Name</td><td class="value">${data.vesselName}</td><td class="label">Tipo / Type</td><td class="value">${data.vesselTypeLabel}</td></tr>
  <tr><td class="label">Area de Fundeio / Anchorage Area</td><td class="value" colspan="3">${data.anchorageArea ?? '-'}</td></tr>
</table>

<div class="section-title">Empresa / Company</div>
<table>
  <tr><td class="label">Empresa / Company</td><td class="value">${data.companyName}</td><td class="label">CNPJ/Tax ID</td><td class="value">${data.companyTaxId ?? '-'}</td></tr>
  <tr><td class="label">Solicitante / Requested By</td><td class="value" colspan="3">${data.requestedBy ?? '-'}</td></tr>
</table>

<div class="section-title">Lancha e Tripulacao / Boat and Crew</div>
<table>
  <tr><td class="label">Lancha / Boat</td><td class="value">${data.boatName ?? '-'}</td><td class="label">Mestre / Captain</td><td class="value">${data.captainName ?? '-'}</td></tr>
  <tr><td class="label">Funcionario / Employee</td><td class="value" colspan="3">${data.employeeName ?? '-'}</td></tr>
</table>

${people.length > 0 ? `
<div class="section-title">Usuarios Transportados / Transported People</div>
<table>
  <tr><th>#</th><th>Nome / Name</th><th>Funcao / Role</th><th>Documento / Document</th></tr>
  ${peopleRows}
</table>
` : ''}

${items.length > 0 ? `
<div class="section-title">Itens / Produtos</div>
<table>
  <tr><th>Produto</th><th>Qtd</th><th>Vlr Unit</th><th>Total</th></tr>
  ${itemsRows}
</table>
` : ''}

<div class="section-title">Valores / Financials</div>
<table class="totals">
  <tr><td class="label">Tarifa Base / Base Rate</td><td class="value">R$ ${((data.rateCents as number) / 100).toFixed(2)}</td></tr>
  <tr><td class="label">Adicionais / Additional</td><td class="value">R$ ${((data.additionalChargesCents as number) / 100).toFixed(2)}</td></tr>
  <tr><td class="label">Desconto / Discount</td><td class="value">R$ ${((data.discountCents as number) / 100).toFixed(2)}</td></tr>
  <tr><td class="label" style="font-size:14px">TOTAL</td><td class="value total-value">${data.totalFormatted}</td></tr>
</table>

${data.notes ? `<div style="margin-top:10px"><strong>Observacoes:</strong> ${data.notes}</div>` : ''}

<div class="footer">
  <div class="signature">Assinatura do Solicitante<br/>Client Signature</div>
  <div class="signature">Assinatura do Mestre<br/>Captain Signature</div>
</div>

<div class="satisfaction">
  <p><strong>Foi bem atendido? / Were you well attended?</strong></p>
  <span class="smiley">&#128522;</span>
  <span class="smiley">&#128528;</span>
  <span class="smiley">&#128543;</span>
</div>

</body>
</html>`;
  }

  /**
   * Generates DANFSe v1.0 — Documento Auxiliar da NFS-e
   * Layout mirrors the official government DANFSe format exactly.
   */
  generateNfseHtml(
    data: Record<string, unknown>,
    issuerData: Record<string, unknown>,
    nfseOfficialData?: Record<string, unknown> | null,
    warning?: string | null,
  ): string {
    const fmtDate = (d: string | Date | null | undefined) => {
      if (!d) return '—';
      const dt = d instanceof Date ? d : new Date(d);
      return dt.toLocaleDateString('pt-BR');
    };
    const fmtDateTime = (d: string | Date | null | undefined) => {
      if (!d) return '—';
      const dt = d instanceof Date ? d : new Date(d);
      return `${dt.toLocaleDateString('pt-BR')} ${dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
    };
    const fmtMoney = (cents: number | null | undefined) => {
      if (!cents && cents !== 0) return '—';
      return (cents / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    };

    const totalCents = (data.totalCents as number) ?? 0;
    const nfseNum = (nfseOfficialData?.numero ?? data.orderNumber) as string;
    const dpsNum = (nfseOfficialData?.dpsNumero ?? nfseOfficialData?.numero ?? data.orderNumber) as string;
    const dpsSerie = (nfseOfficialData?.dpsSerie ?? '900') as string;
    const issuedAt = nfseOfficialData?.issuedAt
      ? fmtDateTime(nfseOfficialData.issuedAt as string)
      : fmtDateTime(data.serviceDate as string);
    const competencia = nfseOfficialData?.competencia
      ? String(nfseOfficialData.competencia)
      : (() => {
          const d = data.serviceDate ? new Date(data.serviceDate as string) : new Date();
          return `${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
        })();
    const chaveAcesso = (nfseOfficialData?.chaveAcesso ?? nfseOfficialData?.codigoVerificacao ?? '—') as string;
    const codigoVerificacao = (nfseOfficialData?.codigoVerificacao ?? '—') as string;
    const ambiente = (nfseOfficialData?.ambiente as string) ?? 'homologacao';
    const isHomologacao = !nfseOfficialData || ambiente === 'homologacao';

    // ISS calculation
    const aliquotaISS = (issuerData.aliquotaISS as number) ?? (nfseOfficialData?.aliquotaISS as number) ?? 5.0;
    const baseCalculo = totalCents;
    const issValorCents = Math.round(baseCalculo * (aliquotaISS / 100));
    const valorLiquidoCents = totalCents - issValorCents;

    // Issuer address
    const issuerFullAddress = [
      issuerData.logradouro,
      issuerData.numero ? `${issuerData.numero}` : null,
      issuerData.complemento,
      issuerData.bairro,
    ].filter(Boolean).join(', ') || (issuerData.address as string) || '—';
    const issuerMunicipio = [issuerData.municipio, issuerData.uf].filter(Boolean).join(' - ') || '—';

    // Tomador address
    const toMunicipio = [data.companyMunicipio, data.companyUf].filter(Boolean).join(' - ') || '—';
    const toAddress = [
      data.companyLogradouro,
      data.companyNumero,
      data.companyBairro,
    ].filter(Boolean).join(', ') || '—';

    // Service codes from issuerData (passed from serviceType fiscal codes)
    const codigoTributacaoNacional = (issuerData.itemListaServico ?? nfseOfficialData?.itemListaServico ?? '—') as string;
    const codigoTributacaoMunicipal = (issuerData.codigoTributacaoMunicipal ?? nfseOfficialData?.codigoTributacaoMunicipal ?? '—') as string;
    const localPrestacao = (issuerData.municipio ?? '—') as string;

    // Discriminação: service description
    const discriminacao = [
      data.serviceTypeLabel ? `${data.serviceTypeLabel}` : null,
      data.serviceDescription as string || null,
      `Embarcação: ${data.vesselName ?? '—'} (${data.vesselTypeLabel ?? '—'})`,
      `Data: ${fmtDate(data.serviceDate as string)} | OS: ${data.orderNumber}`,
      data.anchorageArea ? `Área de Fundeio: ${data.anchorageArea}` : null,
      data.voucherNumber ? `Voucher: ${data.voucherNumber}` : null,
      data.notes ? `Obs: ${data.notes}` : null,
    ].filter(Boolean).join('\n');

    const regimeTributario = (issuerData.regimeTributario as string) ?? 'Simples Nacional';
    const tributacaoISSQN = (nfseOfficialData?.tributacaoISSQN as string) ?? 'Operação Tributável';
    const retencaoISSQN = (nfseOfficialData?.retencaoISSQN as string) ?? 'Não Retido';

    const td = (label: string, value: string, style = '') =>
      `<td style="border:1px solid #ccc;padding:3px 5px;vertical-align:top;${style}"><span style="font-size:7px;color:#555;text-transform:uppercase;display:block">${label}</span><span style="font-size:8.5px;font-weight:bold">${value}</span></td>`;

    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>DANFSe v1.0 - NFS-e ${nfseNum}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: Arial, Helvetica, sans-serif; font-size: 8.5px; color: #000; background: #fff; }
  .page { width: 210mm; margin: 0 auto; padding: 6mm 8mm; }
  table { border-collapse: collapse; width: 100%; }
  .section-header { background: #000; color: #fff; font-size: 8px; font-weight: bold; text-transform: uppercase; padding: 3px 6px; margin-top: 4px; }
  .field-label { font-size: 7px; color: #444; text-transform: uppercase; display: block; margin-bottom: 1px; }
  .field-value { font-size: 8.5px; font-weight: bold; }
  .divider-bar { border: 1px solid #000; background: #fff; text-align: center; font-size: 8px; font-weight: bold; padding: 3px; margin: 3px 0; }
  .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%,-50%) rotate(-30deg); font-size: 80px; color: rgba(180,0,0,0.06); white-space: nowrap; pointer-events: none; }
  .warn-bar { background: #fff3cd; border: 1px solid #ffc107; padding: 5px 8px; font-size: 8px; margin-bottom: 6px; }
  .ok-bar { background: #d4edda; border: 1px solid #28a745; padding: 5px 8px; font-size: 8px; margin-bottom: 6px; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="page">
${isHomologacao ? '<div class="watermark">HOMOLOGAÇÃO</div>' : ''}
${warning ? `<div class="warn-bar"><strong>&#9888; Aviso:</strong> ${warning}</div>` : ''}
${nfseOfficialData && !warning ? `<div class="ok-bar"><strong>&#10003; NFS-e Autorizada</strong> &nbsp;·&nbsp; Nº ${nfseNum} &nbsp;·&nbsp; Verificação: ${codigoVerificacao}</div>` : ''}

<!-- ===== TOPO: Logo + título + município + QR ===== -->
<table style="border:1px solid #000;margin-bottom:2px">
  <tr>
    <td style="width:12%;border-right:1px solid #000;padding:4px;text-align:center;vertical-align:middle">
      <div style="font-size:16px;font-weight:900;color:#005a9e;line-height:1">NFS<span style="font-size:10px">e</span></div>
      <div style="font-size:6px;color:#005a9e;font-weight:bold">Nota Fiscal de<br>Serviço eletrônico</div>
    </td>
    <td style="width:50%;border-right:1px solid #000;padding:6px;text-align:center;vertical-align:middle">
      <div style="font-size:13px;font-weight:bold">DANFSe v1.0</div>
      <div style="font-size:9px">Documento Auxiliar da NFS-e</div>
    </td>
    <td style="width:25%;border-right:1px solid #000;padding:4px;vertical-align:top;font-size:7.5px">
      <strong>PREFEITURA MUNICIPAL DE ${String(issuerMunicipio).toUpperCase()}</strong><br>
      ${issuerData.phone ? `${issuerData.phone}<br>` : ''}
      ${issuerData.email ? `${issuerData.email}` : ''}
    </td>
    <td style="width:13%;padding:4px;text-align:center;vertical-align:middle">
      <div style="border:1px solid #ccc;width:60px;height:60px;margin:auto;display:flex;align-items:center;justify-content:center;font-size:6px;color:#999">QR Code</div>
    </td>
  </tr>
</table>

<!-- Chave de Acesso -->
<table style="border:1px solid #000;margin-bottom:2px">
  <tr>
    <td style="padding:3px 6px">
      <span class="field-label">Chave de Acesso da NFS-e</span>
      <span style="font-family:monospace;font-size:9px;font-weight:bold;letter-spacing:1px;word-break:break-all">${chaveAcesso}</span>
    </td>
  </tr>
</table>

<!-- Número NFS-e + Competência + Data/Hora + DPS -->
<table style="border:1px solid #000;border-collapse:collapse;margin-bottom:2px">
  <tr>
    ${td('Número da NFS-e', nfseNum, 'width:15%')}
    ${td('Competência da NFS-e', competencia, 'width:20%')}
    ${td('Data e Hora da emissão da NFS-e', issuedAt, 'width:40%')}
    <td rowspan="2" style="border:1px solid #ccc;padding:3px 5px;vertical-align:top;width:25%;font-size:7px">
      A autenticidade desta NFS-e pode ser verificada pela leitura do QR Code ou pela consulta da chave de acesso no portal nacional da NFS-e
    </td>
  </tr>
  <tr>
    ${td('Número da DPS', dpsNum)}
    ${td('Série da DPS', dpsSerie)}
    ${td('Data e Hora da emissão da DPS', issuedAt)}
  </tr>
</table>

<!-- ===== EMITENTE ===== -->
<div class="section-header">EMITENTE DA NFS-e &nbsp;·&nbsp; Prestador do Serviço</div>
<table style="border:1px solid #000;border-top:none;border-collapse:collapse">
  <tr>
    ${td('CNPJ / CPF / NIF', issuerData.taxId as string || '—', 'width:30%')}
    ${td('Inscrição Municipal', issuerData.municipalRegistration as string || '—', 'width:30%')}
    ${td('Telefone', issuerData.phone as string || '—', 'width:20%')}
    ${td('', '', 'width:20%')}
  </tr>
  <tr>
    <td colspan="3" style="border:1px solid #ccc;padding:3px 5px">
      <span class="field-label">Nome / Nome Empresarial</span>
      <span class="field-value" style="font-size:10px">${issuerData.name ?? '—'}</span>
    </td>
    ${td('E-mail', issuerData.email as string || '—')}
  </tr>
  <tr>
    <td colspan="2" style="border:1px solid #ccc;padding:3px 5px">
      <span class="field-label">Endereço</span>
      <span class="field-value">${issuerFullAddress}</span>
    </td>
    ${td('Município', issuerMunicipio)}
    ${td('CEP', issuerData.cep as string || '—')}
  </tr>
  <tr>
    ${td('Simples Nacional na Data de Competência', regimeTributario, 'width:50%')}
    ${td('Regime de Apuração Tributária pelo SN', '—', 'width:50%')}
  </tr>
</table>

<!-- ===== TOMADOR ===== -->
<div class="section-header">TOMADOR DO SERVIÇO</div>
<table style="border:1px solid #000;border-top:none;border-collapse:collapse">
  <tr>
    ${td('CNPJ / CPF / NIF', data.companyTaxId as string || '—', 'width:30%')}
    ${td('Inscrição Municipal', '—', 'width:30%')}
    ${td('Telefone', data.companyPhone as string || '—', 'width:20%')}
    ${td('', '', 'width:20%')}
  </tr>
  <tr>
    <td colspan="3" style="border:1px solid #ccc;padding:3px 5px">
      <span class="field-label">Nome / Nome Empresarial</span>
      <span class="field-value" style="font-size:10px">${data.companyName ?? '—'}</span>
    </td>
    ${td('E-mail', data.companyEmail as string || '—')}
  </tr>
  <tr>
    <td colspan="2" style="border:1px solid #ccc;padding:3px 5px">
      <span class="field-label">Endereço</span>
      <span class="field-value">${toAddress}</span>
    </td>
    ${td('Município', toMunicipio)}
    ${td('CEP', data.companyCep as string || '—')}
  </tr>
</table>

<!-- Intermediário -->
<div class="divider-bar">INTERMEDIÁRIO DO SERVIÇO NÃO IDENTIFICADO NA NFS-e</div>

<!-- ===== SERVIÇO PRESTADO ===== -->
<div class="section-header">SERVIÇO PRESTADO</div>
<table style="border:1px solid #000;border-top:none;border-collapse:collapse">
  <tr>
    ${td('Código de Tributação Nacional', codigoTributacaoNacional, 'width:25%')}
    ${td('Código de Tributação Municipal', codigoTributacaoMunicipal, 'width:25%')}
    ${td('Local da Prestação', localPrestacao, 'width:30%')}
    ${td('País da Prestação', 'Brasil', 'width:20%')}
  </tr>
  <tr>
    <td colspan="4" style="border:1px solid #ccc;padding:3px 5px">
      <span class="field-label">Descrição do Serviço</span>
      <span class="field-value" style="white-space:pre-line;font-weight:normal">${discriminacao}</span>
    </td>
  </tr>
</table>

<!-- ===== TRIBUTAÇÃO MUNICIPAL ===== -->
<div class="section-header">TRIBUTAÇÃO MUNICIPAL</div>
<table style="border:1px solid #000;border-top:none;border-collapse:collapse">
  <tr>
    ${td('Tributação do ISSQN', tributacaoISSQN, 'width:25%')}
    ${td('País Resultado da Prestação do Serviço', '—', 'width:25%')}
    ${td('Município de Incidência do ISSQN', issuerMunicipio, 'width:30%')}
    ${td('Regime Especial de Tributação', 'Nenhum', 'width:20%')}
  </tr>
  <tr>
    ${td('Tipo de Imunidade', '—', 'width:25%')}
    ${td('Suspensão da Exigibilidade do ISSQN', 'Não', 'width:25%')}
    ${td('Número Processo Suspensão', '—', 'width:30%')}
    ${td('Benefício Municipal', '—', 'width:20%')}
  </tr>
  <tr>
    ${td('Valor do Serviço', `R$ ${fmtMoney(totalCents)}`, 'width:25%')}
    ${td('Desconto Incondicionado', '—', 'width:25%')}
    ${td('Total Deduções/Reduções', '—', 'width:30%')}
    ${td('Cálculo do BM', '—', 'width:20%')}
  </tr>
  <tr>
    ${td('BC ISSQN', `R$ ${fmtMoney(baseCalculo)}`, 'width:25%')}
    ${td('Alíquota Aplicada', `${aliquotaISS.toFixed(2).replace('.', ',')} %`, 'width:25%')}
    ${td('Retenção do ISSQN', retencaoISSQN, 'width:30%')}
    ${td('ISSQN Apurado', `R$ ${fmtMoney(issValorCents)}`, 'width:20%')}
  </tr>
</table>

<!-- ===== TRIBUTAÇÃO FEDERAL ===== -->
<div class="section-header">TRIBUTAÇÃO FEDERAL</div>
<table style="border:1px solid #000;border-top:none;border-collapse:collapse">
  <tr>
    ${td('IRRF', '—', 'width:25%')}
    ${td('Contribuição Previdenciária - Retida', '—', 'width:25%')}
    ${td('Contribuições Sociais - Retidas', '—', 'width:25%')}
    ${td('Descrição Contrib. Sociais - Retidas', '—', 'width:25%')}
  </tr>
  <tr>
    ${td('PIS – Débito Apuração Própria', '—', 'width:25%')}
    ${td('COFINS – Débito Apuração Própria', '—', 'width:25%')}
    <td colspan="2" style="border:1px solid #ccc;padding:3px 5px"></td>
  </tr>
</table>

<!-- ===== VALOR TOTAL DA NFS-E ===== -->
<div class="section-header">VALOR TOTAL DA NFS-E</div>
<table style="border:1px solid #000;border-top:none;border-collapse:collapse">
  <tr>
    ${td('Valor do Serviço', `R$ ${fmtMoney(totalCents)}`, 'width:25%')}
    ${td('Desconto Condicionado', '—', 'width:25%')}
    ${td('Desconto Incondicionado', '—', 'width:25%')}
    ${td('ISSQN Retido', '—', 'width:25%')}
  </tr>
  <tr>
    ${td('Total das Retenções Federais', '—', 'width:25%')}
    ${td('PIS/COFINS – Débito Apur. Própria', '—', 'width:25%')}
    <td style="border:1px solid #ccc;padding:3px 5px" colspan="2">
      <span class="field-label">Valor Líquido da NFS-e</span>
      <span style="font-size:13px;font-weight:bold">R$ ${fmtMoney(valorLiquidoCents)}</span>
    </td>
  </tr>
</table>

<!-- ===== TOTAIS APROXIMADOS DOS TRIBUTOS ===== -->
<div class="section-header">TOTAIS APROXIMADOS DOS TRIBUTOS</div>
<table style="border:1px solid #000;border-top:none;border-collapse:collapse">
  <tr>
    ${td('Federais', '—', 'width:33%')}
    ${td('Estaduais', '—', 'width:33%')}
    ${td('Municipais', `R$ ${fmtMoney(issValorCents)} (ISS ${aliquotaISS.toFixed(2).replace('.', ',')}%)`, 'width:34%')}
  </tr>
</table>

<!-- ===== INFORMAÇÕES COMPLEMENTARES ===== -->
<div class="section-header">INFORMAÇÕES COMPLEMENTARES</div>
<table style="border:1px solid #000;border-top:none">
  <tr>
    <td style="padding:5px 6px;font-size:8px;line-height:1.7">
      ${nfseOfficialData
        ? `NFS-e emitida via plataforma autorizada · Chave: ${chaveAcesso}`
        : `Documento gerado pelo sistema FlexCatalog. Esta NFS-e ainda não foi enviada à prefeitura.`}
      &nbsp;|&nbsp; OS: ${data.orderNumber ?? '—'}
      ${isHomologacao ? ' &nbsp;|&nbsp; <strong style="color:#c00">AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL</strong>' : ''}
    </td>
  </tr>
</table>

</div>
</body>
</html>`;
  }
}
