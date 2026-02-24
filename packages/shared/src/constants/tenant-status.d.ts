export declare const TENANT_STATUS: {
    readonly PENDING_PAYMENT: "PENDING_PAYMENT";
    readonly TRIAL: "TRIAL";
    readonly ACTIVE: "ACTIVE";
    readonly PAST_DUE: "PAST_DUE";
    readonly CANCELED: "CANCELED";
};
export type TenantStatus = keyof typeof TENANT_STATUS;
export declare const ACTIVE_STATUSES: TenantStatus[];
export declare const BLOCKED_STATUSES: TenantStatus[];
