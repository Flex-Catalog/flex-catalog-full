"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BLOCKED_STATUSES = exports.ACTIVE_STATUSES = exports.TENANT_STATUS = void 0;
exports.TENANT_STATUS = {
    PENDING_PAYMENT: 'PENDING_PAYMENT',
    TRIAL: 'TRIAL',
    ACTIVE: 'ACTIVE',
    PAST_DUE: 'PAST_DUE',
    CANCELED: 'CANCELED',
};
exports.ACTIVE_STATUSES = ['ACTIVE', 'TRIAL'];
exports.BLOCKED_STATUSES = ['PENDING_PAYMENT', 'PAST_DUE', 'CANCELED'];
//# sourceMappingURL=tenant-status.js.map