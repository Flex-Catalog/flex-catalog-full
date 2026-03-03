import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import {
  IServiceTypeRepository,
  ServiceTypeEntity,
  ServiceTypeFiscalCodes,
  CreateServiceTypeData,
  UpdateServiceTypeData,
  ServiceTypeQueryOptions,
  PaginatedServiceTypes,
} from '../../domain/repositories/service-type.repository.interface';

@Injectable()
export class PrismaServiceTypeRepository implements IServiceTypeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private toEntity(record: any): ServiceTypeEntity {
    return {
      id: record.id,
      tenantId: record.tenantId,
      name: record.name,
      code: record.code,
      description: record.description ?? null,
      isActive: record.isActive,
      categoryId: record.categoryId ?? null,
      fiscalCodes: {
        itemListaServico: record.itemListaServico ?? undefined,
        codigoTributacaoMunicipal: record.codigoTributacaoMunicipal ?? undefined,
        aliquotaISS: record.aliquotaISS ?? undefined,
        cnaeCode: record.cnaeCode ?? undefined,
        ncm: record.ncm ?? undefined,
        cfop: record.cfop ?? undefined,
        icmsSituacaoTributaria: record.icmsSituacaoTributaria ?? undefined,
        icmsOrigem: record.icmsOrigem ?? undefined,
        pisSituacaoTributaria: record.pisSituacaoTributaria ?? undefined,
        cofinsSituacaoTributaria: record.cofinsSituacaoTributaria ?? undefined,
      },
      createdById: record.createdById ?? null,
      updatedById: record.updatedById ?? null,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private toFlatFiscal(codes?: ServiceTypeFiscalCodes): Record<string, any> {
    if (!codes) return {};
    return {
      itemListaServico: codes.itemListaServico ?? null,
      codigoTributacaoMunicipal: codes.codigoTributacaoMunicipal ?? null,
      aliquotaISS: codes.aliquotaISS ?? null,
      cnaeCode: codes.cnaeCode ?? null,
      ncm: codes.ncm ?? null,
      cfop: codes.cfop ?? null,
      icmsSituacaoTributaria: codes.icmsSituacaoTributaria ?? null,
      icmsOrigem: codes.icmsOrigem ?? null,
      pisSituacaoTributaria: codes.pisSituacaoTributaria ?? null,
      cofinsSituacaoTributaria: codes.cofinsSituacaoTributaria ?? null,
    };
  }

  async findById(id: string, tenantId: string): Promise<ServiceTypeEntity | null> {
    const record = await this.prisma.serviceType.findFirst({
      where: { id, tenantId },
    });
    return record ? this.toEntity(record) : null;
  }

  async findByCode(code: string, tenantId: string): Promise<ServiceTypeEntity | null> {
    const record = await this.prisma.serviceType.findUnique({
      where: { tenantId_code: { tenantId, code } },
    });
    return record ? this.toEntity(record) : null;
  }

  async findAll(tenantId: string, options: ServiceTypeQueryOptions): Promise<PaginatedServiceTypes> {
    const page = options.page ?? 1;
    const limit = options.limit ?? 50;
    const skip = (page - 1) * limit;

    const where: any = { tenantId };
    if (options.isActive !== undefined) where.isActive = options.isActive;
    if (options.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { code: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.serviceType.findMany({
        where,
        skip,
        take: limit,
        orderBy: { name: 'asc' },
      }),
      this.prisma.serviceType.count({ where }),
    ]);

    return {
      data: data.map((r) => this.toEntity(r)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async create(data: CreateServiceTypeData): Promise<ServiceTypeEntity> {
    const record = await this.prisma.serviceType.create({
      data: {
        tenantId: data.tenantId,
        name: data.name,
        code: data.code.toUpperCase(),
        description: data.description ?? null,
        ...this.toFlatFiscal(data.fiscalCodes),
        categoryId: data.categoryId ?? null,
        isActive: true,
        createdById: data.createdById,
        updatedById: data.createdById,
      },
    });
    return this.toEntity(record);
  }

  async update(id: string, tenantId: string, data: UpdateServiceTypeData): Promise<ServiceTypeEntity> {
    const updateData: any = { updatedById: data.updatedById };
    if (data.name !== undefined) updateData.name = data.name;
    if (data.code !== undefined) updateData.code = data.code.toUpperCase();
    if (data.description !== undefined) updateData.description = data.description;
    if (data.isActive !== undefined) updateData.isActive = data.isActive;
    if (data.fiscalCodes !== undefined) Object.assign(updateData, this.toFlatFiscal(data.fiscalCodes));
    if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;

    const record = await this.prisma.serviceType.update({
      where: { id },
      data: updateData,
    });
    return this.toEntity(record);
  }

  async delete(id: string, tenantId: string): Promise<void> {
    await this.prisma.serviceType.delete({ where: { id } });
  }

  async existsWithCode(code: string, tenantId: string, excludeId?: string): Promise<boolean> {
    const record = await this.prisma.serviceType.findFirst({
      where: {
        tenantId,
        code: code.toUpperCase(),
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    });
    return !!record;
  }

  async isUsedByOrders(code: string, tenantId: string): Promise<boolean> {
    const count = await this.prisma.serviceOrder.count({
      where: { tenantId, serviceType: code },
    });
    return count > 0;
  }
}
