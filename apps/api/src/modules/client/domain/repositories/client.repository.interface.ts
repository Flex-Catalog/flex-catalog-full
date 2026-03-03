export interface ClientEntity {
  readonly id: string;
  readonly tenantId: string;
  readonly name: string;
  readonly tradeName: string | null;
  readonly taxId: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly logradouro: string | null;
  readonly numero: string | null;
  readonly complemento: string | null;
  readonly bairro: string | null;
  readonly municipio: string | null;
  readonly uf: string | null;
  readonly cep: string | null;
  readonly notes: string | null;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateClientData {
  readonly tenantId: string;
  readonly name: string;
  readonly tradeName?: string;
  readonly taxId?: string;
  readonly email?: string;
  readonly phone?: string;
  readonly logradouro?: string;
  readonly numero?: string;
  readonly complemento?: string;
  readonly bairro?: string;
  readonly municipio?: string;
  readonly uf?: string;
  readonly cep?: string;
  readonly notes?: string;
}

export interface UpdateClientData {
  readonly name?: string;
  readonly tradeName?: string | null;
  readonly taxId?: string | null;
  readonly email?: string | null;
  readonly phone?: string | null;
  readonly logradouro?: string | null;
  readonly numero?: string | null;
  readonly complemento?: string | null;
  readonly bairro?: string | null;
  readonly municipio?: string | null;
  readonly uf?: string | null;
  readonly cep?: string | null;
  readonly notes?: string | null;
  readonly isActive?: boolean;
}

export interface ClientQueryOptions {
  readonly page?: number;
  readonly limit?: number;
  readonly search?: string;
  readonly isActive?: boolean;
}

export interface PaginatedClients {
  readonly data: ClientEntity[];
  readonly total: number;
  readonly page: number;
  readonly limit: number;
  readonly totalPages: number;
}

export interface IClientRepository {
  findById(id: string, tenantId: string): Promise<ClientEntity | null>;
  findAll(tenantId: string, options: ClientQueryOptions): Promise<PaginatedClients>;
  search(tenantId: string, q: string): Promise<ClientEntity[]>;
  create(data: CreateClientData): Promise<ClientEntity>;
  update(id: string, tenantId: string, data: UpdateClientData): Promise<ClientEntity>;
  delete(id: string, tenantId: string): Promise<void>;
  existsWithTaxId(taxId: string, tenantId: string, excludeId?: string): Promise<boolean>;
}

export const CLIENT_REPOSITORY = Symbol('CLIENT_REPOSITORY');
