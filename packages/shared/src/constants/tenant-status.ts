export const TENANT_STATUS = {
  PENDING_PAYMENT: 'PENDING_PAYMENT',
  TRIAL: 'TRIAL',
  ACTIVE: 'ACTIVE',
  PAST_DUE: 'PAST_DUE',
  CANCELED: 'CANCELED',
} as const;

export type TenantStatus = keyof typeof TENANT_STATUS;

export const ACTIVE_STATUSES: TenantStatus[] = ['ACTIVE', 'TRIAL'];
export const BLOCKED_STATUSES: TenantStatus[] = ['PENDING_PAYMENT', 'PAST_DUE', 'CANCELED'];
