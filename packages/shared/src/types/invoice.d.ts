import type { CountryCode } from '../constants/countries';
export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'ISSUED' | 'FAILED' | 'CANCELED';
export interface InvoiceAddress {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    cityCode?: string;
    state: string;
    zipCode: string;
    country?: string;
    phone?: string;
}
export interface InvoiceCustomer {
    name: string;
    taxId: string;
    email?: string;
    phone?: string;
    address?: InvoiceAddress;
    stateRegistration?: string;
    ieIndicator?: '1' | '2' | '9';
}
export interface InvoiceIssuer {
    name: string;
    tradeName?: string;
    taxId: string;
    stateRegistration?: string;
    municipalRegistration?: string;
    taxRegime?: '1' | '2' | '3';
    address: InvoiceAddress;
}
export interface InvoiceItem {
    productId?: string;
    description: string;
    quantity: number;
    unitPriceCents: number;
    totalCents: number;
    unit?: string;
    ncm?: string;
    cfop?: string;
    cest?: string;
    icmsOrigin?: string;
    icmsCST?: string;
    icmsCSOSN?: string;
    icmsRate?: number;
    pisCST?: string;
    cofinsCST?: string;
}
export interface InvoicePayload {
    recipientName?: string;
    recipientTaxId?: string;
    issuer?: InvoiceIssuer;
    customer?: InvoiceCustomer;
    items: InvoiceItem[];
    notes?: string;
    paymentMethod?: string;
    operationType?: string;
    series?: string;
    number?: number;
}
export interface InvoiceResult {
    success?: boolean;
    invoiceNumber?: string;
    protocol?: string;
    issuedAt?: string | Date;
    pdfUrl?: string;
    danfePdf?: string;
    xml?: string;
    xmlContent?: string;
    error?: string;
    message?: string;
}
export interface Invoice {
    id: string;
    tenantId: string;
    country: CountryCode;
    status: InvoiceStatus;
    payload: InvoicePayload;
    result?: InvoiceResult;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateInvoiceInput {
    country: CountryCode;
    payload: InvoicePayload;
}
