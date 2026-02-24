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
   * Generates NFS-e (Nota Fiscal de Servico Eletronica) HTML
   * @param nfseOfficialData - Official NFS-e data from Focus NFe (if issued)
   * @param warning - Warning message if NFS-e was not officially issued
   */
  generateNfseHtml(
    data: Record<string, unknown>,
    issuerData: Record<string, unknown>,
    nfseOfficialData?: Record<string, unknown> | null,
    warning?: string | null,
  ): string {
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>NFS-e - ${data.orderNumber}</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: Arial, sans-serif; font-size: 11px; padding: 20px; }
  .nfse-header { border: 2px solid #000; padding: 15px; margin-bottom: 10px; display: flex; justify-content: space-between; }
  .nfse-title { font-size: 14px; font-weight: bold; text-align: center; background: #eee; padding: 5px; margin-bottom: 10px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
  td, th { border: 1px solid #000; padding: 4px 6px; font-size: 10px; }
  .section { font-weight: bold; background: #ddd; font-size: 10px; text-transform: uppercase; }
  .label { font-size: 9px; color: #666; display: block; }
  .value { font-size: 11px; font-weight: bold; }
</style>
</head>
<body>

${warning ? `<div style="background:#fff3cd;border:1px solid #ffc107;padding:10px;margin-bottom:10px;font-size:11px;border-radius:4px"><strong>Aviso:</strong> ${warning}</div>` : ''}
${nfseOfficialData ? `<div style="background:#d4edda;border:1px solid #28a745;padding:8px;margin-bottom:10px;font-size:10px;border-radius:4px"><strong>NFS-e Autorizada</strong> · Número: ${nfseOfficialData.numero ?? '—'} · Cód. Verificação: ${nfseOfficialData.codigoVerificacao ?? '—'} · Emitida em: ${nfseOfficialData.issuedAt ? new Date(nfseOfficialData.issuedAt as string).toLocaleString('pt-BR') : '—'}</div>` : ''}

<div class="nfse-title">NOTA FISCAL DE SERVICOS ELETRONICA - NFS-e</div>

<table>
  <tr>
    <td rowspan="3" style="width:60%">
      <span class="label">PRESTADOR DE SERVICOS</span><br>
      <span class="value">${issuerData.name ?? 'Empresa'}</span><br>
      <span class="label">CNPJ: ${issuerData.taxId ?? '—'}</span><br>
      <span class="label">Inscricao Municipal: ${issuerData.municipalRegistration ?? '—'}</span><br>
      <span class="label">${issuerData.address ?? '—'}</span>
    </td>
    <td><span class="label">NUMERO DA NFS-e</span><br><span class="value">${nfseOfficialData?.numero ?? data.orderNumber}</span></td>
  </tr>
  <tr><td><span class="label">DATA EMISSAO</span><br><span class="value">${nfseOfficialData?.issuedAt ? new Date(nfseOfficialData.issuedAt as string).toLocaleDateString('pt-BR') : new Date().toLocaleDateString('pt-BR')}</span></td></tr>
  <tr><td><span class="label">COMPETENCIA</span><br><span class="value">${new Date().toLocaleDateString('pt-BR', { month: '2-digit', year: 'numeric' })}</span></td></tr>
</table>

<table>
  <tr><td class="section" colspan="4">TOMADOR DE SERVICOS</td></tr>
  <tr>
    <td colspan="2"><span class="label">RAZAO SOCIAL</span><br><span class="value">${data.companyName}</span></td>
    <td colspan="2"><span class="label">CNPJ/CPF</span><br><span class="value">${data.companyTaxId ?? '-'}</span></td>
  </tr>
</table>

<table>
  <tr><td class="section" colspan="4">DISCRIMINACAO DOS SERVICOS</td></tr>
  <tr><td colspan="4" style="min-height:100px; vertical-align:top; padding:10px">
    <strong>${data.serviceTypeLabel}</strong><br><br>
    ${data.serviceDescription}<br><br>
    Navio: ${data.vesselName} (${data.vesselTypeLabel})<br>
    Data do Servico: ${data.serviceDate ? new Date(data.serviceDate as string).toLocaleDateString('pt-BR') : ''}<br>
    Horario: ${data.startTime ? new Date(data.startTime as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''} - ${data.endTime ? new Date(data.endTime as string).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Em andamento'}<br>
    Periodo: ${data.servicePeriodLabel}<br>
    ${data.voucherNumber ? `Voucher: ${data.voucherNumber}` : ''}<br>
    ${data.notes ? `Obs: ${data.notes}` : ''}
  </td></tr>
</table>

<table>
  <tr><td class="section" colspan="4">VALORES</td></tr>
  <tr>
    <td><span class="label">VALOR DOS SERVICOS (R$)</span><br><span class="value">${data.totalFormatted}</span></td>
    <td><span class="label">BASE DE CALCULO (R$)</span><br><span class="value">${data.totalFormatted}</span></td>
    <td><span class="label">ALIQUOTA ISS (%)</span><br><span class="value">5,00</span></td>
    <td><span class="label">VALOR ISS (R$)</span><br><span class="value">R$ ${(((data.totalCents as number) * 0.05) / 100).toFixed(2)}</span></td>
  </tr>
  <tr>
    <td colspan="3"><span class="label">VALOR LIQUIDO DA NFS-e (R$)</span></td>
    <td><span class="value" style="font-size:14px">${data.totalFormatted}</span></td>
  </tr>
</table>

</body>
</html>`;
  }
}
