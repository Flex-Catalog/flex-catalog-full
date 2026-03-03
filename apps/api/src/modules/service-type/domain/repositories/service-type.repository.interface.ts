export interface ServiceTypeFiscalCodes {
  readonly itemListaServico?: string;
  readonly codigoTributacaoMunicipal?: string;
  readonly aliquotaISS?: number;
  readonly cnaeCode?: string;
  readonly ncm?: string;
  readonly cfop?: string;
  readonly icmsSituacaoTributaria?: string;
  readonly icmsOrigem?: number;
  readonly pisSituacaoTributaria?: string;
  readonly cofinsSituacaoTributaria?: string;
}

export interface ServiceTypeEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly code: string;
  readonly description: string | null;
  readonly fiscalCodes: ServiceTypeFiscalCodes;
  readonly categoryId: string | null;
  readonly isActive: boolean;
  readonly createdById: string | null;
  readonly updatedById: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateServiceTypeData {
  readonly tenantId: string;
  readonly name: string;
  readonly code: string;
  readonly description?: string;
  readonly fiscalCodes?: ServiceTypeFiscalCodes;
  readonly categoryId?: string;
  readonly createdById: string;
}

export interface UpdateServiceTypeData {
  readonly name?: string;
  readonly code?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
  readonly fiscalCodes?: ServiceTypeFiscalCodes;
  readonly categoryId?: string | null;
  readonly updatedById: string;
}

export interface ServiceTypeQueryOptions {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly isActive?: boolean;
}

export interface PaginatedServiceTypes {
  readonly data: ServiceTypeEntity[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export interface IServiceTypeRepository {
  findById(id: string, tenantId: string): Promise<ServiceTypeEntity | null>;
  findByCode(code: string, tenantId: string): Promise<ServiceTypeEntity | null>;
  findAll(tenantId: string, options: ServiceTypeQueryOptions): Promise<PaginatedServiceTypes>;
  create(data: CreateServiceTypeData): Promise<ServiceTypeEntity>;
  update(id: string, tenantId: string, data: UpdateServiceTypeData): Promise<ServiceTypeEntity>;
  delete(id: string, tenantId: string): Promise<void>;
  existsWithCode(code: string, tenantId: string, excludeId?: string): Promise<boolean>;
  isUsedByOrders(code: string, tenantId: string): Promise<boolean>;
}

export const SERVICE_TYPE_REPOSITORY = Symbol('SERVICE_TYPE_REPOSITORY');
