import type { Role } from '../constants/permissions';

export interface User {
  id: string;
  tenantId: string;
  email: string;
  name: string;
  roles: Role[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserInput {
  tenantId: string;
  email: string;
  name: string;
  password: string;
  roles?: Role[];
}

export interface UserWithoutPassword extends Omit<User, 'passwordHash'> {}
