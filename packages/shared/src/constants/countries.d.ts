export declare const COUNTRIES: {
    readonly BR: {
        readonly code: "BR";
        readonly name: "Brazil";
        readonly locale: "pt-BR";
        readonly currency: "BRL";
        readonly taxIdTypes: readonly ["CNPJ", "CPF"];
        readonly invoiceType: "NFe";
    };
    readonly US: {
        readonly code: "US";
        readonly name: "United States";
        readonly locale: "en-US";
        readonly currency: "USD";
        readonly taxIdTypes: readonly ["EIN", "SSN"];
        readonly invoiceType: "Invoice";
    };
    readonly PT: {
        readonly code: "PT";
        readonly name: "Portugal";
        readonly locale: "pt-PT";
        readonly currency: "EUR";
        readonly taxIdTypes: readonly ["NIF", "NIPC"];
        readonly invoiceType: "Fatura";
    };
    readonly MX: {
        readonly code: "MX";
        readonly name: "Mexico";
        readonly locale: "es-MX";
        readonly currency: "MXN";
        readonly taxIdTypes: readonly ["RFC"];
        readonly invoiceType: "Factura";
    };
    readonly CL: {
        readonly code: "CL";
        readonly name: "Chile";
        readonly locale: "es-CL";
        readonly currency: "CLP";
        readonly taxIdTypes: readonly ["RUT"];
        readonly invoiceType: "Factura";
    };
    readonly GB: {
        readonly code: "GB";
        readonly name: "United Kingdom";
        readonly locale: "en-GB";
        readonly currency: "GBP";
        readonly taxIdTypes: readonly ["UTR", "CRN"];
        readonly invoiceType: "Invoice";
    };
};
export type CountryCode = keyof typeof COUNTRIES;
export declare const SUPPORTED_LOCALES: readonly ["pt", "en", "es"];
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
