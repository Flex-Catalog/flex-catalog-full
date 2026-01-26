export const TENANT_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
} as const;

export type TenantStatus = keyof typeof TENANT_STATUS;

export const ACTIVE_STATUSES: TenantStatus[] = ['ACTIVE'];
export const BLOCKED_STATUSES: TenantStatus[] = ['PENDING_PAYMENT', 'PAST_DUE', 'CANCELED'];
