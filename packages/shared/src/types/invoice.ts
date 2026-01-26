import type { CountryCode } from '../constants/countries';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'ISSUED' | 'FAILED' | 'CANCELED';

/**
 * Endereço para NFe/Invoice
 */
export interface InvoiceAddress {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  cityCode?: string; // Código IBGE do município (BR)
  state: string;
  zipCode: string;
  country?: string;
  phone?: string;
}

/**
 * Dados do cliente/destinatário
 */
export interface InvoiceCustomer {
  name: string;
  taxId: string; // CNPJ/CPF (BR), EIN (US), NIF (PT)
  email?: string;
  phone?: string;
  address?: InvoiceAddress;
  // Brasil específico
  stateRegistration?: string; // Inscrição Estadual
  ieIndicator?: '1' | '2' | '9'; // 1=Contribuinte, 2=Isento, 9=Não contribuinte
}

/**
 * Dados do emitente (empresa que emite a nota)
 */
export interface InvoiceIssuer {
  name: string; // Razão Social
  tradeName?: string; // Nome Fantasia
  taxId: string; // CNPJ
  stateRegistration?: string; // Inscrição Estadual
  municipalRegistration?: string; // Inscrição Municipal
  taxRegime?: '1' | '2' | '3'; // 1=Simples, 2=Simples Excesso, 3=Regime Normal
  address: InvoiceAddress;
}

/**
 * Item da Invoice/NFe
 */
export interface InvoiceItem {
  productId?: string;
  description: string;
  quantity: number;
  unitPriceCents: number;
  totalCents: number;
  unit?: string; // UN, KG, L, etc.
  // Dados fiscais (BR)
  ncm?: string; // Código NCM
  cfop?: string; // Código CFOP
  cest?: string; // Código CEST
  // Tributos
  icmsOrigin?: string;
  icmsCST?: string;
  icmsCSOSN?: string;
  icmsRate?: number;
  pisCST?: string;
  cofinsCST?: string;
}

/**
 * Payload completo da Invoice
 */
export interface InvoicePayload {
  // Dados básicos (retrocompatível)
  recipientName?: string;
  recipientTaxId?: string;
  // Dados estruturados
  issuer?: InvoiceIssuer;
  customer?: InvoiceCustomer;
  items: InvoiceItem[];
  // Informações adicionais
  notes?: string;
  paymentMethod?: string;
  operationType?: string; // Natureza da operação
  series?: string;
  number?: number;
}

export interface InvoiceResult {
  success?: boolean;
  invoiceNumber?: string;
  protocol?: string;
  issuedAt?: string | Date;
  pdfUrl?: string;
  danfePdf?: string; // Base64 do DANFE
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
