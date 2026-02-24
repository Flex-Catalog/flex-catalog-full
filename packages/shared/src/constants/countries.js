"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SUPPORTED_LOCALES = exports.COUNTRIES = void 0;
exports.COUNTRIES = {
    BR: {
        code: 'BR',
        name: 'Brazil',
        locale: 'pt-BR',
        currency: 'BRL',
        taxIdTypes: ['CNPJ', 'CPF'],
        invoiceType: 'NFe',
    },
    US: {
        code: 'US',
        name: 'United States',
        locale: 'en-US',
        currency: 'USD',
        taxIdTypes: ['EIN', 'SSN'],
        invoiceType: 'Invoice',
    },
    PT: {
        code: 'PT',
        name: 'Portugal',
        locale: 'pt-PT',
        currency: 'EUR',
        taxIdTypes: ['NIF', 'NIPC'],
        invoiceType: 'Fatura',
    },
    MX: {
        code: 'MX',
        name: 'Mexico',
        locale: 'es-MX',
        currency: 'MXN',
        taxIdTypes: ['RFC'],
        invoiceType: 'Factura',
    },
    CL: {
        code: 'CL',
        name: 'Chile',
        locale: 'es-CL',
        currency: 'CLP',
        taxIdTypes: ['RUT'],
        invoiceType: 'Factura',
    },
    GB: {
        code: 'GB',
        name: 'United Kingdom',
        locale: 'en-GB',
        currency: 'GBP',
        taxIdTypes: ['UTR', 'CRN'],
        invoiceType: 'Invoice',
    },
};
exports.SUPPORTED_LOCALES = ['pt', 'en', 'es'];
//# sourceMappingURL=countries.js.map