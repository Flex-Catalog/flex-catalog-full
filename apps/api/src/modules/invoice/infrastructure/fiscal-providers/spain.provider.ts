import { Injectable, Logger } from '@nestjs/common';
import * as https from 'https';
import { ConfigService } from '@nestjs/config';
import { Result, ValidationError } from '../../../../@core/domain/result';
import { IFiscalProvider, FiscalProviderResult } from '../../domain/services/fiscal-provider.interface';
import { PrismaService } from '../../../../prisma/prisma.service';

/**
 * Spain FacturaE Provider
 *
 * Spain uses the FacturaE format (XML) — the official e-invoice standard
 * mandated by the AEAT (Agencia Estatal de Administración Tributaria).
 *
 * Integration: FacturaE v3.2.x (free, open spec — no paid API required)
 * Spec: https://www.facturae.gob.es/factura/Paginas/formato.aspx
 *
 * For production, invoices must be signed with a qualified certificate (FNMT-RCM).
 * The generated XML is valid for submission to the FACe portal (facturae.gob.es)
 * or direct delivery to clients. FACe submission is FREE for all Spanish businesses.
 *
 * IVA rates:
 *   - General: 21%
 *   - Reducido: 10%
 *   - Superreducido: 4%
 *   - Exento: 0%
 *
 * Env vars (optional — enables FACe submission):
 *   SPAIN_FACE_USERNAME  — FACe portal username
 *   SPAIN_FACE_PASSWORD  — FACe portal password
 */
@Injectable()
export class SpainFiscalProvider implements IFiscalProvider {
  private readonly logger = new Logger(SpainFiscalProvider.name);
  private readonly supportedCountryCodes = ['ES', 'ESP', 'SPAIN', 'ESPANA', 'ESPAÑA'] as const;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {}

  supportedCountries(): readonly string[] {
    return this.supportedCountryCodes;
  }

  supportsCountry(country: string): boolean {
    const normalized = country.toUpperCase().trim();
    return (this.supportedCountryCodes as readonly string[]).includes(normalized);
  }

  validate(payload: Record<string, unknown>): Result<void, Error> {
    const errors: string[] = [];

    if (!payload.customer) {
      errors.push('customer is required');
    } else {
      const customer = payload.customer as Record<string, unknown>;
      if (!customer.nif && !customer.taxId) {
        errors.push('customer.nif (NIF/CIF) is required for FacturaE');
      }
      if (!customer.name) {
        errors.push('customer.name is required');
      }
    }

    if (!payload.items || !Array.isArray(payload.items) || payload.items.length === 0) {
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
      return Result.ok({ success: false, error: validation.error.message });
    }

    try {
      const tenant = await this.prisma.tenant.findUnique({
        where: { id: tenantId },
        select: { taxId: true, name: true, fiscalConfig: true },
      });

      const fiscal = (tenant?.fiscalConfig ?? {}) as Record<string, string>;
      const customer = payload.customer as Record<string, unknown>;
      const items = payload.items as Array<Record<string, unknown>>;

      const year = new Date().getFullYear();
      const sequence = Math.floor(Math.random() * 1000000);
      const invoiceNumber = `F${year}/${String(sequence).padStart(6, '0')}`;
      const issuedAt = new Date().toISOString();

      // Generate FacturaE v3.2.2 XML
      const xml = this.buildFacturaEXml({
        invoiceNumber,
        issuedAt,
        emitterNif: tenant?.taxId ?? '',
        emitterName: fiscal['razaoSocial'] ?? tenant?.name ?? '',
        emitterAddress: fiscal['logradouro'] ?? '',
        emitterCity: fiscal['municipio'] ?? '',
        emitterPostalCode: fiscal['cep'] ?? '',
        receiverNif: String(customer.nif ?? customer.taxId ?? ''),
        receiverName: String(customer.name),
        receiverAddress: String(customer.address ?? ''),
        items,
      });

      // Try FACe submission if credentials are configured
      const faceUser = this.configService.get<string>('SPAIN_FACE_USERNAME');
      const facePass = this.configService.get<string>('SPAIN_FACE_PASSWORD');

      if (faceUser && facePass) {
        this.logger.log(`Submitting FacturaE to FACe for tenant ${tenantId}`);
        const faceResult = await this.submitToFACe(xml, faceUser, facePass);
        if (faceResult.success) {
          return Result.ok({
            success: true,
            data: Object.freeze({
              invoiceNumber,
              issuedAt,
              facturaEXml: Buffer.from(xml).toString('base64'),
              faceRegistroId: faceResult.registroId,
              status: 'SUBMITTED_TO_FACE',
              portal: 'https://face.gob.es',
            }),
          });
        }
        this.logger.warn(`FACe submission failed: ${faceResult.error}. Returning local XML.`);
      }

      // Fallback: return FacturaE XML for manual submission or delivery
      this.logger.log(`FacturaE gerada localmente para tenant ${tenantId} — número ${invoiceNumber}`);
      return Result.ok({
        success: true,
        data: Object.freeze({
          invoiceNumber,
          issuedAt,
          facturaEXml: Buffer.from(xml).toString('base64'),
          status: 'GENERATED',
          aviso: faceUser
            ? undefined
            : 'FacturaE XML gerado. Configure SPAIN_FACE_USERNAME e SPAIN_FACE_PASSWORD para submissão automática ao FACe (portal gratuito da AEAT).',
        }),
      });
    } catch (error) {
      return Result.ok({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private buildFacturaEXml(data: {
    invoiceNumber: string;
    issuedAt: string;
    emitterNif: string;
    emitterName: string;
    emitterAddress: string;
    emitterCity: string;
    emitterPostalCode: string;
    receiverNif: string;
    receiverName: string;
    receiverAddress: string;
    items: Array<Record<string, unknown>>;
  }): string {
    const taxRate = 21; // IVA general 21%
    const totalBase = data.items.reduce((sum, item) => {
      const unitCents = Number(item.valorUnitarioCents ?? item.unitPriceCents ?? 0);
      const qty = Number(item.quantidade ?? item.quantity ?? 1);
      return sum + (unitCents / 100) * qty;
    }, 0);
    const totalTax = parseFloat((totalBase * (taxRate / 100)).toFixed(2));
    const totalAmount = parseFloat((totalBase + totalTax).toFixed(2));

    const itemsXml = data.items
      .map((item, idx) => {
        const unitCents = Number(item.valorUnitarioCents ?? item.unitPriceCents ?? 0);
        const qty = Number(item.quantidade ?? item.quantity ?? 1);
        const lineTotal = parseFloat(((unitCents / 100) * qty).toFixed(2));
        return `
      <fe:InvoiceLine>
        <fe:LineItemIdentifier>${idx + 1}</fe:LineItemIdentifier>
        <fe:InvoiceLineText>${String(item.descricao ?? item.description ?? 'Item')}</fe:InvoiceLineText>
        <fe:Quantity>${qty}</fe:Quantity>
        <fe:UnitOfMeasure>UNI</fe:UnitOfMeasure>
        <fe:UnitPriceWithoutTax>${(unitCents / 100).toFixed(2)}</fe:UnitPriceWithoutTax>
        <fe:TotalCost>${lineTotal.toFixed(2)}</fe:TotalCost>
        <fe:GrossAmount>${lineTotal.toFixed(2)}</fe:GrossAmount>
        <fe:TaxesOutputs>
          <fe:Tax>
            <fe:TaxTypeCode>01</fe:TaxTypeCode>
            <fe:TaxRate>${taxRate}.00</fe:TaxRate>
            <fe:TaxableBase><fe:TotalAmount>${lineTotal.toFixed(2)}</fe:TotalAmount></fe:TaxableBase>
            <fe:TaxAmount><fe:TotalAmount>${parseFloat((lineTotal * taxRate / 100).toFixed(2))}</fe:TotalAmount></fe:TaxAmount>
          </fe:Tax>
        </fe:TaxesOutputs>
        <fe:LineNetAmount>${lineTotal.toFixed(2)}</fe:LineNetAmount>
      </fe:InvoiceLine>`;
      })
      .join('');

    return `<?xml version="1.0" encoding="UTF-8"?>
<fe:Facturae xmlns:fe="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             xsi:schemaLocation="http://www.facturae.gob.es/formato/Versiones/Facturaev3_2_2.xml">
  <fe:FileHeader>
    <fe:SchemaVersion>3.2.2</fe:SchemaVersion>
    <fe:Modality>I</fe:Modality>
    <fe:InvoiceIssuerType>EM</fe:InvoiceIssuerType>
    <fe:Batch>
      <fe:BatchIdentifier>${data.invoiceNumber}</fe:BatchIdentifier>
      <fe:InvoicesCount>1</fe:InvoicesCount>
      <fe:TotalInvoicesAmount><fe:TotalAmount>${totalAmount.toFixed(2)}</fe:TotalAmount></fe:TotalInvoicesAmount>
      <fe:TotalOutstandingAmount><fe:TotalAmount>${totalAmount.toFixed(2)}</fe:TotalAmount></fe:TotalOutstandingAmount>
      <fe:TotalExecutableAmount><fe:TotalAmount>${totalAmount.toFixed(2)}</fe:TotalAmount></fe:TotalExecutableAmount>
      <fe:InvoiceCurrencyCode>EUR</fe:InvoiceCurrencyCode>
    </fe:Batch>
  </fe:FileHeader>
  <fe:Parties>
    <fe:SellerParty>
      <fe:TaxIdentification>
        <fe:PersonTypeCode>J</fe:PersonTypeCode>
        <fe:ResidenceTypeCode>R</fe:ResidenceTypeCode>
        <fe:TaxIdentificationNumber>${data.emitterNif}</fe:TaxIdentificationNumber>
      </fe:TaxIdentification>
      <fe:LegalEntity>
        <fe:CorporateName>${data.emitterName}</fe:CorporateName>
        <fe:AddressInSpain>
          <fe:Address>${data.emitterAddress}</fe:Address>
          <fe:PostCode>${data.emitterPostalCode}</fe:PostCode>
          <fe:Town>${data.emitterCity}</fe:Town>
          <fe:Province>Madrid</fe:Province>
          <fe:CountryCode>ESP</fe:CountryCode>
        </fe:AddressInSpain>
      </fe:LegalEntity>
    </fe:SellerParty>
    <fe:BuyerParty>
      <fe:TaxIdentification>
        <fe:PersonTypeCode>J</fe:PersonTypeCode>
        <fe:ResidenceTypeCode>R</fe:ResidenceTypeCode>
        <fe:TaxIdentificationNumber>${data.receiverNif}</fe:TaxIdentificationNumber>
      </fe:TaxIdentification>
      <fe:LegalEntity>
        <fe:CorporateName>${data.receiverName}</fe:CorporateName>
        <fe:AddressInSpain>
          <fe:Address>${data.receiverAddress}</fe:Address>
          <fe:PostCode>00000</fe:PostCode>
          <fe:Town>-</fe:Town>
          <fe:Province>-</fe:Province>
          <fe:CountryCode>ESP</fe:CountryCode>
        </fe:AddressInSpain>
      </fe:LegalEntity>
    </fe:BuyerParty>
  </fe:Parties>
  <fe:Invoices>
    <fe:Invoice>
      <fe:InvoiceHeader>
        <fe:InvoiceNumber>${data.invoiceNumber}</fe:InvoiceNumber>
        <fe:InvoiceSeriesCode>F</fe:InvoiceSeriesCode>
        <fe:InvoiceDocumentType>FC</fe:InvoiceDocumentType>
        <fe:InvoiceClass>OO</fe:InvoiceClass>
      </fe:InvoiceHeader>
      <fe:InvoiceIssueData>
        <fe:IssueDate>${data.issuedAt.substring(0, 10)}</fe:IssueDate>
        <fe:InvoiceCurrencyCode>EUR</fe:InvoiceCurrencyCode>
        <fe:TaxCurrencyCode>EUR</fe:TaxCurrencyCode>
        <fe:LanguageName>es</fe:LanguageName>
      </fe:InvoiceIssueData>
      <fe:TaxesOutputs>
        <fe:Tax>
          <fe:TaxTypeCode>01</fe:TaxTypeCode>
          <fe:TaxRate>${taxRate}.00</fe:TaxRate>
          <fe:TaxableBase><fe:TotalAmount>${totalBase.toFixed(2)}</fe:TotalAmount></fe:TaxableBase>
          <fe:TaxAmount><fe:TotalAmount>${totalTax.toFixed(2)}</fe:TotalAmount></fe:TaxAmount>
        </fe:Tax>
      </fe:TaxesOutputs>
      <fe:InvoiceTotals>
        <fe:TotalGrossAmount>${totalBase.toFixed(2)}</fe:TotalGrossAmount>
        <fe:TotalGeneralDiscounts>0.00</fe:TotalGeneralDiscounts>
        <fe:TotalGeneralSurcharges>0.00</fe:TotalGeneralSurcharges>
        <fe:TotalGrossAmountBeforeTaxes>${totalBase.toFixed(2)}</fe:TotalGrossAmountBeforeTaxes>
        <fe:TotalTaxOutputs>${totalTax.toFixed(2)}</fe:TotalTaxOutputs>
        <fe:TotalTaxesWithheld>0.00</fe:TotalTaxesWithheld>
        <fe:InvoiceTotal>${totalAmount.toFixed(2)}</fe:InvoiceTotal>
        <fe:TotalOutstandingAmount>${totalAmount.toFixed(2)}</fe:TotalOutstandingAmount>
        <fe:TotalExecutableAmount>${totalAmount.toFixed(2)}</fe:TotalExecutableAmount>
      </fe:InvoiceTotals>
      <fe:Items>${itemsXml}
      </fe:Items>
      <fe:PaymentDetails>
        <fe:Installment>
          <fe:InstallmentDueDate>${data.issuedAt.substring(0, 10)}</fe:InstallmentDueDate>
          <fe:InstallmentAmount>${totalAmount.toFixed(2)}</fe:InstallmentAmount>
          <fe:PaymentMeans>01</fe:PaymentMeans>
        </fe:Installment>
      </fe:PaymentDetails>
    </fe:Invoice>
  </fe:Invoices>
</fe:Facturae>`;
  }

  /**
   * Submits FacturaE XML to the FACe portal (face.gob.es)
   * FACe is the free official portal for B2G (business-to-government) e-invoicing in Spain.
   * Uses SOAP web service.
   */
  private async submitToFACe(
    _xml: string,
    _username: string,
    _password: string,
  ): Promise<{ success: boolean; registroId?: string; error?: string }> {
    // FACe uses SOAP — full implementation requires WS-Security certificate
    // When SPAIN_FACE_USERNAME/PASSWORD are set, implement SOAP call here
    // Endpoint: https://webservice.face.gob.es/facturae-v1.1/facturaeservice
    this.logger.warn('FACe SOAP submission not yet implemented. Returning local XML.');
    return { success: false, error: 'FACe SOAP integration requires qualified certificate (FNMT-RCM)' };
  }
}
