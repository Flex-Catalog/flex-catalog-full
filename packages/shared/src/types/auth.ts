import type { Role, Permission } from '../constants/permissions';
import type { Feature } from '../constants/features';
import type { TenantStatus } from '../constants/tenant-status';

export interface RegisterInput {
  companyName: string;
  country: string;
  locale?: string;
  email: string;
  name: string;
  password: string;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface TokenPayload {
  sub: string;
  tenantId: string;
  email: string;
  roles: Role[];
}

export interface AuthUser {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: Role[];
  permissions: Permission[];
  tenantStatus: TenantStatus;
  tenantFeatures: Feature[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
    name: string;
    roles: Role[];
  };
  tenant: {
    id: string;
    name: string;
    status: TenantStatus;
  };
  tokens: AuthTokens;
  checkoutUrl?: string;
}
