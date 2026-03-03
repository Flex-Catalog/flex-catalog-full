import { Injectable, Inject, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import {
  IServiceTypeRepository,
  SERVICE_TYPE_REPOSITORY,
  ServiceTypeEntity,
  ServiceTypeFiscalCodes,
} from '../../domain/repositories/service-type.repository.interface';

// ============ DTOs ============

export interface ServiceTypeDto {
  readonly id: string;
  readonly name: string;
  readonly code: string;
  readonly description: string | null;
  readonly isActive: boolean;
  readonly categoryId: string | null;
  readonly itemListaServico: string | null;
  readonly codigoTributacaoMunicipal: string | null;
  readonly aliquotaISS: number | null;
  readonly cnaeCode: string | null;
  readonly ncm: string | null;
  readonly cfop: string | null;
  readonly icmsSituacaoTributaria: string | null;
  readonly icmsOrigem: number | null;
  readonly pisSituacaoTributaria: string | null;
  readonly cofinsSituacaoTributaria: string | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

function toDto(entity: ServiceTypeEntity): ServiceTypeDto {
  return {
    id: entity.id,
    name: entity.name,
    code: entity.code,
    description: entity.description,
    isActive: entity.isActive,
    categoryId: entity.categoryId ?? null,
    itemListaServico: entity.fiscalCodes.itemListaServico ?? null,
    codigoTributacaoMunicipal: entity.fiscalCodes.codigoTributacaoMunicipal ?? null,
    aliquotaISS: entity.fiscalCodes.aliquotaISS ?? null,
    cnaeCode: entity.fiscalCodes.cnaeCode ?? null,
    ncm: entity.fiscalCodes.ncm ?? null,
    cfop: entity.fiscalCodes.cfop ?? null,
    icmsSituacaoTributaria: entity.fiscalCodes.icmsSituacaoTributaria ?? null,
    icmsOrigem: entity.fiscalCodes.icmsOrigem ?? null,
    pisSituacaoTributaria: entity.fiscalCodes.pisSituacaoTributaria ?? null,
    cofinsSituacaoTributaria: entity.fiscalCodes.cofinsSituacaoTributaria ?? null,
    createdAt: entity.createdAt,
    updatedAt: entity.updatedAt,
  };
}

export interface CreateServiceTypeDto {
  readonly tenantId: string;
  readonly userId: string;
  readonly name: string;
  readonly code: string;
  readonly description?: string;
  readonly fiscalCodes?: ServiceTypeFiscalCodes;
  readonly categoryId?: string;
}

export interface UpdateServiceTypeDto {
  readonly tenantId: string;
  readonly userId: string;
  readonly name?: string;
  readonly code?: string;
  readonly description?: string | null;
  readonly isActive?: boolean;
  readonly fiscalCodes?: ServiceTypeFiscalCodes;
  readonly categoryId?: string | null;
}

// ============ Use Cases ============

@Injectable()
export class CreateServiceTypeUseCase {
  constructor(@Inject(SERVICE_TYPE_REPOSITORY) private readonly repo: IServiceTypeRepository) {}

  async execute(dto: CreateServiceTypeDto): Promise<ServiceTypeDto> {
    if (!dto.name?.trim()) throw new BadRequestException('Name is required');
    if (!dto.code?.trim()) throw new BadRequestException('Code is required');

    const normalizedCode = dto.code.toUpperCase().trim();
    if (!/^[A-Z0-9_]+$/.test(normalizedCode)) {
      throw new BadRequestException('Code must contain only letters, numbers and underscores');
    }

    const exists = await this.repo.existsWithCode(normalizedCode, dto.tenantId);
    if (exists) throw new ConflictException(`Service type with code "${normalizedCode}" already exists`);

    const entity = await this.repo.create({
      tenantId: dto.tenantId,
      name: dto.name.trim(),
      code: normalizedCode,
      description: dto.description?.trim(),
      fiscalCodes: dto.fiscalCodes,
      categoryId: dto.categoryId,
      createdById: dto.userId,
    });

    return toDto(entity);
  }
}

@Injectable()
export class UpdateServiceTypeUseCase {
  constructor(@Inject(SERVICE_TYPE_REPOSITORY) private readonly repo: IServiceTypeRepository) {}

  async execute(id: string, dto: UpdateServiceTypeDto): Promise<ServiceTypeDto> {
    const existing = await this.repo.findById(id, dto.tenantId);
    if (!existing) throw new NotFoundException('Service type not found');

    if (dto.code !== undefined) {
      const normalizedCode = dto.code.toUpperCase().trim();
      if (!/^[A-Z0-9_]+$/.test(normalizedCode)) {
        throw new BadRequestException('Code must contain only letters, numbers and underscores');
      }
      if (normalizedCode !== existing.code) {
        const exists = await this.repo.existsWithCode(normalizedCode, dto.tenantId, id);
        if (exists) throw new ConflictException(`Service type with code "${normalizedCode}" already exists`);
      }
    }

    const entity = await this.repo.update(id, dto.tenantId, {
      name: dto.name?.trim(),
      code: dto.code?.toUpperCase().trim(),
      description: dto.description,
      isActive: dto.isActive,
      fiscalCodes: dto.fiscalCodes,
      categoryId: dto.categoryId,
      updatedById: dto.userId,
    });

    return toDto(entity);
  }
}

@Injectable()
export class DeleteServiceTypeUseCase {
  constructor(@Inject(SERVICE_TYPE_REPOSITORY) private readonly repo: IServiceTypeRepository) {}

  async execute(id: string, tenantId: string): Promise<void> {
    const existing = await this.repo.findById(id, tenantId);
    if (!existing) throw new NotFoundException('Service type not found');

    const inUse = await this.repo.isUsedByOrders(existing.code, tenantId);
    if (inUse) {
      throw new BadRequestException(
        'Cannot delete a service type that is used by existing service orders',
      );
    }

    await this.repo.delete(id, tenantId);
  }
}

@Injectable()
export class GetServiceTypeQuery {
  constructor(@Inject(SERVICE_TYPE_REPOSITORY) private readonly repo: IServiceTypeRepository) {}

  async execute(id: string, tenantId: string): Promise<ServiceTypeDto> {
    const entity = await this.repo.findById(id, tenantId);
    if (!entity) throw new NotFoundException('Service type not found');
    return toDto(entity);
  }
}

@Injectable()
export class ListServiceTypesQuery {
  constructor(@Inject(SERVICE_TYPE_REPOSITORY) private readonly repo: IServiceTypeRepository) {}

  async execute(
    tenantId: string,
    options: { page?: number; limit?: number; search?: string; isActive?: boolean },
  ): Promise<{ data: ServiceTypeDto[]; total: number; page: number; limit: number; totalPages: number }> {
    const result = await this.repo.findAll(tenantId, options);
    return {
      ...result,
      data: result.data.map(toDto),
    };
  }
}
