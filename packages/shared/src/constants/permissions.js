"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = exports.ROLES = exports.PERMISSIONS = void 0;
exports.PERMISSIONS = {
    PRODUCT_READ: 'PRODUCT_READ',
    PRODUCT_WRITE: 'PRODUCT_WRITE',
    INVOICE_READ: 'INVOICE_READ',
    INVOICE_ISSUE: 'INVOICE_ISSUE',
    USER_MANAGE: 'USER_MANAGE',
    TENANT_MANAGE: 'TENANT_MANAGE',
    AUDIT_READ: 'AUDIT_READ',
    CATEGORY_READ: 'CATEGORY_READ',
    CATEGORY_WRITE: 'CATEGORY_WRITE',
    PLATFORM_ADMIN: 'PLATFORM_ADMIN',
};
exports.ROLES = {
    PLATFORM_ADMIN: 'PLATFORM_ADMIN',
    TENANT_ADMIN: 'TENANT_ADMIN',
    OPERATOR: 'OPERATOR',
    READER: 'READER',
};
exports.ROLE_PERMISSIONS = {
    PLATFORM_ADMIN: [
        'PRODUCT_READ',
        'PRODUCT_WRITE',
        'INVOICE_READ',
        'INVOICE_ISSUE',
        'USER_MANAGE',
        'TENANT_MANAGE',
        'AUDIT_READ',
        'CATEGORY_READ',
        'CATEGORY_WRITE',
        'PLATFORM_ADMIN',
    ],
    TENANT_ADMIN: [
        'PRODUCT_READ',
        'PRODUCT_WRITE',
        'INVOICE_READ',
        'INVOICE_ISSUE',
        'USER_MANAGE',
        'TENANT_MANAGE',
        'AUDIT_READ',
        'CATEGORY_READ',
        'CATEGORY_WRITE',
    ],
    OPERATOR: [
        'PRODUCT_READ',
        'PRODUCT_WRITE',
        'INVOICE_READ',
        'INVOICE_ISSUE',
        'CATEGORY_READ',
        'CATEGORY_WRITE',
    ],
    READER: ['PRODUCT_READ', 'INVOICE_READ', 'CATEGORY_READ'],
};
//# sourceMappingURL=permissions.js.map