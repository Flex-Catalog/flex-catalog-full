export declare const FEATURES: {
    readonly PRODUCTS: "PRODUCTS";
    readonly INVOICES: "INVOICES";
    readonly USERS: "USERS";
    readonly REPORTS: "REPORTS";
    readonly CATEGORIES: "CATEGORIES";
    readonly UPLOADS: "UPLOADS";
};
export type Feature = keyof typeof FEATURES;
export declare const DEFAULT_FEATURES: Feature[];
