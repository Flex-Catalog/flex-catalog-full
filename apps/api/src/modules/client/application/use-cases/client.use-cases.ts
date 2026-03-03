import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import {
  IClientRepository,
  CLIENT_REPOSITORY,
  ClientEntity,
} from '../../domain/repositories/client.repository.interface';

// ============ DTOs ============

export interface ClientDto {
  readonly id: string;
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

function toDto(entity: ClientEntity): ClientDto {
  return {
    id: entity.id,
    name: entity.name,
    tradeName: entity.tradeName,
    taxId: entity.taxId,
    email: entity.email,
    phone: entity.phone,
    logradouro: entity.logradouro,
    numero: entity.numero,
    complemento: entity.complemento,
    bairro: entity.bairro,
    municipio: entity.municipio,
    uf: entity.uf,
    cep: entity.cep,
    notes: entity.notes,
    isActive: entity.isActive,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

// ============ Use Cases ============

@Injectable()
export class CreateClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly repo: IClientRepository) {}

  async execute(tenantId: string, body: any): Promise<ClientDto> {
    if (!body.name?.trim()) throw new BadRequestException('Name is required');

    if (body.taxId?.trim()) {
      const exists = await this.repo.existsWithTaxId(body.taxId.trim(), tenantId);
      if (exists) throw new ConflictException(`Client with this tax ID already exists`);
    }

    const entity = await this.repo.create({
      tenantId,
      name: body.name.trim(),
      tradeName: body.tradeName?.trim() || undefined,
      taxId: body.taxId?.trim() || undefined,
      email: body.email?.trim() || undefined,
      phone: body.phone?.trim() || undefined,
      logradouro: body.logradouro?.trim() || undefined,
      numero: body.numero?.trim() || undefined,
      complemento: body.complemento?.trim() || undefined,
      bairro: body.bairro?.trim() || undefined,
      municipio: body.municipio?.trim() || undefined,
      uf: body.uf?.trim() || undefined,
      cep: body.cep?.trim() || undefined,
      notes: body.notes?.trim() || undefined,
    });

    return toDto(entity);
  }
}

@Injectable()
export class UpdateClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly repo: IClientRepository) {}

  async execute(id: string, tenantId: string, body: any): Promise<ClientDto> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw new NotFoundException('Client not found');

    if (body.taxId !== undefined && body.taxId?.trim() && body.taxId.trim() !== existing.taxId) {
      const exists = await this.repo.existsWithTaxId(body.taxId.trim(), tenantId, id);
      if (exists) throw new ConflictException(`Client with this tax ID already exists`);
    }

    const entity = await this.repo.update(id, tenantId, {
      name: body.name?.trim(),
      tradeName: body.tradeName !== undefined ? (body.tradeName?.trim() || null) : undefined,
      taxId: body.taxId !== undefined ? (body.taxId?.trim() || null) : undefined,
      email: body.email !== undefined ? (body.email?.trim() || null) : undefined,
      phone: body.phone !== undefined ? (body.phone?.trim() || null) : undefined,
      logradouro: body.logradouro !== undefined ? (body.logradouro?.trim() || null) : undefined,
      numero: body.numero !== undefined ? (body.numero?.trim() || null) : undefined,
      complemento: body.complemento !== undefined ? (body.complemento?.trim() || null) : undefined,
      bairro: body.bairro !== undefined ? (body.bairro?.trim() || null) : undefined,
      municipio: body.municipio !== undefined ? (body.municipio?.trim() || null) : undefined,
      uf: body.uf !== undefined ? (body.uf?.trim() || null) : undefined,
      cep: body.cep !== undefined ? (body.cep?.trim() || null) : undefined,
      notes: body.notes !== undefined ? (body.notes?.trim() || null) : undefined,
      isActive: body.isActive !== undefined ? Boolean(body.isActive) : undefined,
    });

    return toDto(entity);
  }
}

@Injectable()
export class DeleteClientUseCase {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly repo: IClientRepository) {}

  async execute(id: string, tenantId: string): Promise<void> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw new NotFoundException('Client not found');
    await this.repo.delete(id, tenantId);
  }
}

@Injectable()
export class GetClientQuery {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly repo: IClientRepository) {}

  async execute(id: string, tenantId: string): Promise<ClientDto> {
    const entity = await this.repo.findById(id, tenantId);
    if (!entity) throw new NotFoundException('Client not found');
    return toDto(entity);
  }
}

@Injectable()
export class ListClientsQuery {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly repo: IClientRepository) {}

  async execute(
    tenantId: string,
    options: { page?: number; limit?: number; search?: string; isActive?: boolean },
  ): Promise<{ data: ClientDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const result = await this.repo.findAll(tenantId, options);
    return { ...result, data: result.data.map(toDto) };
  }
}

@Injectable()
export class SearchClientsQuery {
  constructor(@Inject(CLIENT_REPOSITORY) private readonly repo: IClientRepository) {}

  async execute(tenantId: string, q: string): Promise<ClientDto[]> {
    const results = await this.repo.search(tenantId, q);
    return results.map(toDto);
  }
}
