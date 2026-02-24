import type { TenantStatus } from '../constants/tenant-status';
import type { Feature } from '../constants/features';
import type { CountryCode, SupportedLocale } from '../constants/countries';
export interface Tenant {
    id: string;
    name: string;
    country: CountryCode;
    locale: SupportedLocale;
    features: Feature[];
    status: TenantStatus;
    taxId?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    currentPeriodEnd?: Date;
    trialEndsAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export interface CreateTenantInput {
    name: string;
    country: CountryCode;
    locale?: SupportedLocale;
}
