export declare const PERMISSIONS: {
    readonly PRODUCT_READ: "PRODUCT_READ";
    readonly PRODUCT_WRITE: "PRODUCT_WRITE";
    readonly INVOICE_READ: "INVOICE_READ";
    readonly INVOICE_ISSUE: "INVOICE_ISSUE";
    readonly USER_MANAGE: "USER_MANAGE";
    readonly TENANT_MANAGE: "TENANT_MANAGE";
    readonly AUDIT_READ: "AUDIT_READ";
    readonly CATEGORY_READ: "CATEGORY_READ";
    readonly CATEGORY_WRITE: "CATEGORY_WRITE";
    readonly PLATFORM_ADMIN: "PLATFORM_ADMIN";
};
export type Permission = keyof typeof PERMISSIONS;
export declare const ROLES: {
    readonly PLATFORM_ADMIN: "PLATFORM_ADMIN";
    readonly TENANT_ADMIN: "TENANT_ADMIN";
    readonly OPERATOR: "OPERATOR";
    readonly READER: "READER";
};
export type Role = keyof typeof ROLES;
export declare const ROLE_PERMISSIONS: Record<Role, Permission[]>;
